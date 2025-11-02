#!/usr/bin/env python3
"""
Transition Detector
Detects and classifies scene transitions (cuts, fades, dissolves, wipes)
to prevent them from being misidentified as motion events.
"""

import cv2
import numpy as np
from typing import Optional, Tuple, Dict


class TransitionDetector:
    """
    Detect different types of scene transitions to filter them from motion detection.
    Prevents transitions from being falsely identified as motion events.
    """

    def __init__(
        self,
        cut_threshold: float = 0.7,
        fade_threshold: float = 0.3,
        dissolve_threshold: float = 0.5
    ):
        """
        Args:
            cut_threshold: Threshold for detecting hard cuts (0-1, higher = more strict)
            fade_threshold: Threshold for detecting fades (0-1, higher = more strict)
            dissolve_threshold: Threshold for detecting dissolves (0-1, higher = more strict)
        """
        self.cut_threshold = cut_threshold
        self.fade_threshold = fade_threshold
        self.dissolve_threshold = dissolve_threshold

    def detect_transition_type(
        self,
        prev_frame: np.ndarray,
        curr_frame: np.ndarray,
        next_frame: Optional[np.ndarray] = None
    ) -> Optional[str]:
        """
        Detect if a transition is occurring and classify its type.

        Args:
            prev_frame: Previous frame (BGR)
            curr_frame: Current frame (BGR)
            next_frame: Next frame (BGR), optional but helps with accuracy

        Returns:
            Transition type: 'cut', 'fade', 'dissolve', or None if no transition
        """
        # Check for hard cut first (most common)
        if self._is_cut(prev_frame, curr_frame):
            return 'cut'

        # Check for fade to/from black or white
        if self._is_fade(prev_frame, curr_frame, next_frame):
            return 'fade'

        # Check for dissolve/cross-fade
        if self._is_dissolve(prev_frame, curr_frame):
            return 'dissolve'

        return None

    def _is_cut(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> bool:
        """
        Detect hard cuts using histogram comparison.
        A cut shows very different histograms between consecutive frames.

        Args:
            prev_frame: Previous frame
            curr_frame: Current frame

        Returns:
            True if hard cut detected
        """
        # Convert to grayscale for faster processing
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

        # Calculate histograms
        prev_hist = cv2.calcHist([prev_gray], [0], None, [256], [0, 256])
        curr_hist = cv2.calcHist([curr_gray], [0], None, [256], [0, 256])

        # Normalize histograms
        prev_hist = cv2.normalize(prev_hist, prev_hist).flatten()
        curr_hist = cv2.normalize(curr_hist, curr_hist).flatten()

        # Compare histograms using correlation
        # Correlation close to 1 = similar, close to 0 = very different
        correlation = cv2.compareHist(
            prev_hist.reshape(-1, 1),
            curr_hist.reshape(-1, 1),
            cv2.HISTCMP_CORREL
        )

        # Low correlation = hard cut
        # Also check if majority of pixels changed significantly
        pixel_diff = np.mean(np.abs(prev_gray.astype(float) - curr_gray.astype(float))) / 255.0

        is_cut = (correlation < (1.0 - self.cut_threshold)) and (pixel_diff > 0.3)

        return is_cut

    def _is_fade(
        self,
        prev_frame: np.ndarray,
        curr_frame: np.ndarray,
        next_frame: Optional[np.ndarray] = None
    ) -> bool:
        """
        Detect fade transitions (fade to/from black or white).
        Fades show gradual uniform brightness changes.

        Args:
            prev_frame: Previous frame
            curr_frame: Current frame
            next_frame: Next frame (optional)

        Returns:
            True if fade detected
        """
        # Convert to grayscale
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

        # Calculate average brightness
        prev_brightness = np.mean(prev_gray) / 255.0
        curr_brightness = np.mean(curr_gray) / 255.0

        # Check for fade to black (brightness decreasing)
        fade_to_black = (prev_brightness > 0.3 and
                        curr_brightness < 0.15 and
                        prev_brightness - curr_brightness > 0.2)

        # Check for fade from black (brightness increasing)
        fade_from_black = (prev_brightness < 0.15 and
                          curr_brightness > 0.3 and
                          curr_brightness - prev_brightness > 0.2)

        # Check for fade to white (brightness increasing to high)
        fade_to_white = (prev_brightness < 0.7 and
                        curr_brightness > 0.85 and
                        curr_brightness - prev_brightness > 0.2)

        # Check for fade from white (brightness decreasing from high)
        fade_from_white = (prev_brightness > 0.85 and
                          curr_brightness < 0.7 and
                          prev_brightness - curr_brightness > 0.2)

        # Check if brightness change is uniform across the frame
        # Fades affect all pixels similarly
        if fade_to_black or fade_from_black or fade_to_white or fade_from_white:
            # Verify uniformity - calculate standard deviation of pixel differences
            pixel_diff = prev_gray.astype(float) - curr_gray.astype(float)
            uniformity = 1.0 - (np.std(pixel_diff) / 255.0)

            # High uniformity (>0.7) means fade, low uniformity means object motion
            if uniformity > 0.7:
                return True

        # If we have next frame, check for sustained fade pattern
        if next_frame is not None:
            next_gray = cv2.cvtColor(next_frame, cv2.COLOR_BGR2GRAY)
            next_brightness = np.mean(next_gray) / 255.0

            # Sustained fade pattern (monotonic brightness change)
            if fade_to_black or fade_from_black:
                brightness_trend = [prev_brightness, curr_brightness, next_brightness]
                is_monotonic = (all(brightness_trend[i] >= brightness_trend[i+1]
                                   for i in range(2)) or
                              all(brightness_trend[i] <= brightness_trend[i+1]
                                   for i in range(2)))
                if is_monotonic:
                    return True

        return False

    def _is_dissolve(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> bool:
        """
        Detect dissolve/cross-fade transitions.
        Dissolves show two scenes blended together (bimodal histogram).

        Args:
            prev_frame: Previous frame
            curr_frame: Current frame

        Returns:
            True if dissolve detected
        """
        # Convert to grayscale
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

        # Calculate histogram of current frame
        curr_hist = cv2.calcHist([curr_gray], [0], None, [256], [0, 256])
        curr_hist = curr_hist.flatten()

        # Smooth histogram to reduce noise
        from scipy.ndimage import gaussian_filter1d
        smoothed_hist = gaussian_filter1d(curr_hist, sigma=5)

        # Find peaks in histogram (bimodal = two scenes blended)
        peaks = self._find_histogram_peaks(smoothed_hist)

        # If 2+ distinct peaks with significant gap, likely dissolve
        if len(peaks) >= 2:
            # Check if peaks are well-separated (not just noise)
            peak_separation = abs(peaks[0] - peaks[1])
            if peak_separation > 50:  # At least 50 brightness levels apart
                # Also check if there's actual blending (not just two regions)
                # In a dissolve, both peak regions should have similar amounts
                peak_balance = min(smoothed_hist[peaks[0]], smoothed_hist[peaks[1]]) / \
                              max(smoothed_hist[peaks[0]], smoothed_hist[peaks[1]])

                if peak_balance > 0.3:  # Both peaks have significant content
                    return True

        # Alternative check: High pixel-level differences but similar overall structure
        pixel_diff = np.mean(np.abs(prev_gray.astype(float) - curr_gray.astype(float))) / 255.0
        structure_similarity = self._calculate_structure_similarity(prev_gray, curr_gray)

        # Dissolve: moderate pixel difference but preserved structure
        if 0.15 < pixel_diff < 0.5 and structure_similarity > 0.5:
            return True

        return False

    def _find_histogram_peaks(self, histogram: np.ndarray, min_distance: int = 30) -> list:
        """
        Find peaks in a histogram.

        Args:
            histogram: 1D histogram array
            min_distance: Minimum distance between peaks

        Returns:
            List of peak indices
        """
        from scipy.signal import find_peaks

        peaks, properties = find_peaks(
            histogram,
            distance=min_distance,
            prominence=np.max(histogram) * 0.1  # At least 10% of max height
        )

        # Sort by height and return top peaks
        if len(peaks) > 0:
            peak_heights = histogram[peaks]
            sorted_indices = np.argsort(peak_heights)[::-1]
            return peaks[sorted_indices[:3]].tolist()  # Top 3 peaks

        return []

    def _calculate_structure_similarity(
        self,
        img1: np.ndarray,
        img2: np.ndarray
    ) -> float:
        """
        Calculate structural similarity between two images using edge detection.

        Args:
            img1: First image (grayscale)
            img2: Second image (grayscale)

        Returns:
            Similarity score (0-1)
        """
        # Detect edges in both images
        edges1 = cv2.Canny(img1, 50, 150)
        edges2 = cv2.Canny(img2, 50, 150)

        # Compare edge patterns
        edge_diff = np.sum(edges1 != edges2) / edges1.size

        # Lower difference = higher similarity
        similarity = 1.0 - edge_diff

        return similarity

    def is_near_transition(
        self,
        frame_idx: int,
        transition_frames: list,
        buffer_frames: int = 15
    ) -> bool:
        """
        Check if a frame is within buffer distance of a known transition.
        Useful for filtering motion detection near transitions.

        Args:
            frame_idx: Frame index to check
            transition_frames: List of frame indices where transitions occur
            buffer_frames: Number of frames to buffer around transitions

        Returns:
            True if within buffer of a transition
        """
        return any(abs(frame_idx - t_frame) <= buffer_frames
                  for t_frame in transition_frames)


# For testing
if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python transition_detector.py <video_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    detector = TransitionDetector()

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)

    ret, prev_frame = cap.read()
    frame_idx = 1
    transitions = []

    print(f"Analyzing video: {video_path}")
    print(f"FPS: {fps}")
    print("-" * 50)

    while True:
        ret, curr_frame = cap.read()
        if not ret:
            break

        ret_next, next_frame = cap.read()
        if ret_next:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)

        transition_type = detector.detect_transition_type(
            prev_frame, curr_frame, next_frame if ret_next else None
        )

        if transition_type:
            timestamp = frame_idx / fps
            transitions.append((timestamp, transition_type))
            print(f"Frame {frame_idx} ({timestamp:.2f}s): {transition_type.upper()}")

        prev_frame = curr_frame
        frame_idx += 1

    cap.release()

    print("-" * 50)
    print(f"Total transitions detected: {len(transitions)}")
