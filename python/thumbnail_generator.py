"""
AI Thumbnail Generator
Extracts and analyzes video frames to suggest best thumbnails
Applies text overlays with various template styles
"""

import argparse
import json
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from pathlib import Path
import os

def print_log(message):
    """Print log message to stderr"""
    print(message, file=sys.stderr)

# Try to import brand kit manager
try:
    from brandkit_manager import BrandKitManager, hex_to_rgb
    BRANDKIT_AVAILABLE = True
    print_log("✓ Brand kit manager imported successfully")
except ImportError:
    BRANDKIT_AVAILABLE = False
    print_log("✗ Brand kit manager not available")

# Try to import rembg for background removal (optional)
try:
    from rembg import remove
    REMBG_AVAILABLE = True
    print_log("✓ rembg imported successfully")
except ImportError as e:
    REMBG_AVAILABLE = False
    print_log(f"✗ rembg not available: {e}")

def calculate_sharpness(image):
    """Calculate image sharpness using Laplacian variance"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    return min(laplacian_var / 100, 100)  # Normalize to 0-100

def calculate_contrast(image):
    """Calculate image contrast"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    contrast = gray.std()
    return min(contrast / 50 * 100, 100)  # Normalize to 0-100

def calculate_vibrancy(image):
    """Calculate color vibrancy"""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    saturation = hsv[:,:,1].mean()
    return min(saturation / 255 * 100, 100)  # Normalize to 0-100

def detect_faces(image, cascade_path=None):
    """Detect faces in image using Haar Cascade"""
    # Try to find the Haar Cascade XML file
    if cascade_path and os.path.exists(cascade_path):
        face_cascade = cv2.CascadeClassifier(cascade_path)
    else:
        # Try OpenCV's built-in path
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    return len(faces) if len(faces) > 0 else 0, faces

def calculate_optimal_text_position(image, faces, text_lines=1, preferred_position='auto'):
    """
    Calculate optimal text position that avoids faces and uses rule of thirds

    Args:
        image: OpenCV image (BGR)
        faces: Array of face rectangles from detectMultiScale [(x,y,w,h), ...]
        text_lines: Number of text lines to position
        preferred_position: 'top', 'middle', 'bottom', or 'auto'

    Returns:
        dict with 'position' (x,y), 'zone' ('top'/'middle'/'bottom'), 'font_size_multiplier'
    """
    height, width = image.shape[:2]

    # Define safe zones using rule of thirds (avoid extreme edges)
    margin_x = int(width * 0.05)  # 5% margin on sides
    margin_y = int(height * 0.08)  # 8% margin top/bottom

    # Text height estimate (will be refined with actual text)
    line_height = int(height * 0.12)  # 12% per line
    text_block_height = line_height * text_lines

    # Define three zones: top, middle, bottom thirds
    zones = {
        'top': (margin_x, margin_y, width - 2*margin_x, height // 3),
        'middle': (margin_x, height // 3, width - 2*margin_x, height // 3),
        'bottom': (margin_x, 2 * height // 3 - text_block_height, width - 2*margin_x, height // 3 + text_block_height)
    }

    # Calculate face occupancy in each zone
    zone_scores = {}
    for zone_name, (zx, zy, zw, zh) in zones.items():
        zone_area = zw * zh
        face_overlap = 0

        # Calculate how much face area overlaps with this zone
        for (fx, fy, fw, fh) in faces:
            # Calculate intersection with zone
            overlap_x = max(0, min(zx + zw, fx + fw) - max(zx, fx))
            overlap_y = max(0, min(zy + zh, fy + fh) - max(zy, fy))
            face_overlap += overlap_x * overlap_y

        # Score: lower is better (less face overlap)
        # Also prefer bottom for traditional YouTube style
        occupancy_penalty = (face_overlap / zone_area) * 100 if zone_area > 0 else 100
        position_bonus = {'top': 10, 'middle': 20, 'bottom': 0}[zone_name]  # Prefer bottom
        zone_scores[zone_name] = occupancy_penalty + position_bonus

    # Select best zone
    if preferred_position in ['top', 'middle', 'bottom']:
        best_zone = preferred_position
    else:
        best_zone = min(zone_scores, key=zone_scores.get)

    # Calculate position within selected zone using rule of thirds horizontally
    zx, zy, zw, zh = zones[best_zone]

    # IMPROVED: Use rule of thirds for horizontal positioning (left vs right vs center)
    # Analyze face positions to choose left, center, or right third
    if len(faces) > 0:
        # Calculate average face position
        avg_face_x = np.mean([fx + fw/2 for (fx, fy, fw, fh) in faces])

        # Position text on opposite side from faces
        if avg_face_x < width * 0.4:
            # Faces on left -> text on right third
            position_x = int(width * 0.7)
            print_log("  📍 Faces on left → positioning text on RIGHT third")
        elif avg_face_x > width * 0.6:
            # Faces on right -> text on left third
            position_x = int(width * 0.3)
            print_log("  📍 Faces on right → positioning text on LEFT third")
        else:
            # Faces centered -> center text too
            position_x = width // 2
            print_log("  📍 Faces centered → centering text")
    else:
        # No faces -> use center
        position_x = width // 2
        print_log("  📍 No faces detected → centering text")

    # Vertically centered within zone
    if best_zone == 'top':
        position_y = zy + text_block_height // 2
    elif best_zone == 'middle':
        position_y = height // 2
    else:  # bottom
        position_y = zy + zh // 2

    # Calculate font size multiplier based on zone occupancy
    # Less occupancy = can use larger text
    occupancy_ratio = zone_scores[best_zone] / 100.0
    font_size_multiplier = 1.0 + (0.3 * (1 - min(occupancy_ratio, 1.0)))  # 1.0 to 1.3x

    print_log(f"  Text positioning: zone={best_zone}, occupancy_scores={zone_scores}")
    print_log(f"  Position: ({position_x}, {position_y}), font_multiplier={font_size_multiplier:.2f}x")

    return {
        'position': (position_x, position_y),
        'zone': best_zone,
        'font_size_multiplier': font_size_multiplier,
        'avoid_regions': faces.tolist() if len(faces) > 0 else []
    }

def wrap_text_smart(text, font, max_width, draw):
    """
    Intelligently wrap text into multiple lines

    Args:
        text: Text string to wrap
        font: PIL ImageFont object
        max_width: Maximum width in pixels
        draw: PIL ImageDraw object for measurement

    Returns:
        list of text lines
    """
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        # Try adding this word to current line
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        line_width = bbox[2] - bbox[0]

        if line_width <= max_width:
            current_line.append(word)
        else:
            # Current line is full, start new line
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                # Single word too long, force it anyway
                lines.append(word)

    # Add remaining words
    if current_line:
        lines.append(' '.join(current_line))

    # Limit to max 3 lines for readability
    if len(lines) > 3:
        lines = lines[:2] + [lines[2] + '...']

    return lines

def score_frame(image, has_faces=False, face_count=0, sharpness=0, contrast=0, vibrancy=0):
    """Score a frame based on multiple quality metrics"""
    score = 0

    # Face presence (most important for thumbnails)
    if has_faces:
        score += 30
        # Bonus for multiple faces (good for reaction thumbnails)
        score += min(face_count * 5, 20)

    # Sharpness (blurry frames are bad)
    score += sharpness * 0.2

    # Contrast (high contrast = more eye-catching)
    score += contrast * 0.2

    # Vibrancy (colorful = more clickable)
    score += vibrancy * 0.15

    return min(score, 100)

def extract_and_analyze_frames(video_path, interval_seconds=2, max_frames=15):
    """Extract frames from video and analyze for thumbnail suitability"""
    print_log(f"Opening video: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    print_log(f"Video info: {duration:.1f}s, {fps:.1f} FPS, {total_frames} frames")

    # Calculate frame interval
    frame_interval = int(fps * interval_seconds)

    candidates = []
    frame_count = 0
    analyzed_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Only analyze frames at intervals
        if frame_count % frame_interval == 0 and analyzed_count < max_frames:
            timestamp = frame_count / fps
            print_log(f"Analyzing frame at {timestamp:.1f}s...")

            # Resize for faster processing
            analysis_frame = cv2.resize(frame, (640, 360))

            # Calculate metrics
            face_count, faces = detect_faces(analysis_frame)
            has_faces = face_count > 0
            sharpness = calculate_sharpness(analysis_frame)
            contrast = calculate_contrast(analysis_frame)
            vibrancy = calculate_vibrancy(analysis_frame)

            # Calculate score
            score = score_frame(analysis_frame, has_faces, face_count, sharpness, contrast, vibrancy)

            candidate = {
                'timestamp': float(timestamp),
                'frame_number': frame_count,
                'score': float(score),
                'has_faces': bool(has_faces),
                'face_count': int(face_count),
                'sharpness': float(sharpness),
                'contrast': float(contrast),
                'vibrancy': float(vibrancy)
            }

            candidates.append(candidate)
            analyzed_count += 1

            print_log(f"  Score: {score:.1f}, Faces: {face_count}, Sharpness: {sharpness:.1f}")

        frame_count += 1

    cap.release()

    # Sort by score and return top candidates
    candidates.sort(key=lambda x: x['score'], reverse=True)
    top_candidates = candidates[:10]

    print_log(f"Analysis complete. Found {len(candidates)} candidates, returning top {len(top_candidates)}")

    return top_candidates

def extract_frame_at_timestamp(video_path, timestamp, output_path):
    """Extract a single frame at specific timestamp"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    # Clamp timestamp to valid range
    timestamp = max(0, min(timestamp, duration - 0.1))
    frame_number = int(timestamp * fps)

    # Ensure frame number is within bounds
    frame_number = max(0, min(frame_number, total_frames - 1))

    print_log(f"Extracting frame {frame_number} at {timestamp}s (FPS: {fps}, Total: {total_frames})")

    # Try position-based seek first
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()

    # If that fails, try time-based seek
    if not ret:
        print_log(f"Frame-based seek failed, trying time-based seek to {timestamp}s")
        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
        ret, frame = cap.read()

    # If still failing, try reading from beginning (slower but more reliable)
    if not ret and frame_number < 1000:  # Only for early frames
        print_log(f"Seeking failed, reading from beginning...")
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        for i in range(frame_number + 1):
            ret, frame = cap.read()
            if not ret:
                break

    cap.release()

    if not ret or frame is None:
        raise Exception(f"Could not extract frame at {timestamp}s (tried frame {frame_number})")

    # Resize to professional thumbnail size (1920x1080 - YouTube 2025 standard)
    frame_resized = cv2.resize(frame, (1920, 1080))

    # Save frame
    cv2.imwrite(output_path, frame_resized)
    print_log(f"Extracted frame saved to: {output_path}")

    return output_path

def create_custom_gradient(width, height, gradient_spec):
    """
    Create custom gradients from a specification dict

    Args:
        width: Image width
        height: Image height
        gradient_spec: Dict with:
            - 'type': 'linear' or 'radial'
            - 'colors': List of RGB tuples
            - 'direction': 'vertical', 'horizontal', 'diagonal' (for linear)
            - 'center': (x_ratio, y_ratio) 0-1 (for radial, default 0.5, 0.5)

    Examples:
        # Linear gradient
        {'type': 'linear', 'colors': [(255,0,0), (0,0,255)], 'direction': 'vertical'}

        # Radial gradient with custom center
        {'type': 'radial', 'colors': [(255,255,0), (255,0,0)], 'center': (0.3, 0.5)}
    """
    gradient_type = gradient_spec.get('type', 'linear')
    colors = gradient_spec.get('colors', [(0, 0, 0), (255, 255, 255)])

    if gradient_type == 'radial':
        center = gradient_spec.get('center', (0.5, 0.5))
        center_x = int(width * center[0])
        center_y = int(height * center[1])
        # Use first and last color for radial
        return create_radial_gradient(width, height, colors[0], colors[-1], center_x, center_y)
    else:
        direction = gradient_spec.get('direction', 'vertical')
        return create_multi_gradient(width, height, colors, direction)

def create_radial_gradient(width, height, center_color, edge_color, center_x=None, center_y=None):
    """
    Create radial gradient with custom center point

    Args:
        width, height: Image dimensions
        center_color, edge_color: RGB tuples
        center_x, center_y: Center point (defaults to center of image)
    """
    if center_x is None:
        center_x = width // 2
    if center_y is None:
        center_y = height // 2

    gradient = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(gradient)

    max_dist = ((width ** 2 + height ** 2) ** 0.5) / 2

    for y in range(height):
        for x in range(width):
            dist = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
            ratio = min(1.0, dist / max_dist)

            r = int(center_color[0] * (1 - ratio) + edge_color[0] * ratio)
            g = int(center_color[1] * (1 - ratio) + edge_color[1] * ratio)
            b = int(center_color[2] * (1 - ratio) + edge_color[2] * ratio)

            draw.point((x, y), fill=(r, g, b))

    return gradient

def create_multi_gradient(width, height, colors, direction='vertical'):
    """Create a gradient with multiple color stops"""
    gradient = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(gradient)

    num_colors = len(colors)

    if direction == 'vertical':
        for y in range(height):
            ratio = y / height
            # Find which two colors to interpolate between
            segment = ratio * (num_colors - 1)
            idx = int(segment)
            idx = min(idx, num_colors - 2)
            local_ratio = segment - idx

            color1, color2 = colors[idx], colors[idx + 1]
            r = int(color1[0] * (1 - local_ratio) + color2[0] * local_ratio)
            g = int(color1[1] * (1 - local_ratio) + color2[1] * local_ratio)
            b = int(color1[2] * (1 - local_ratio) + color2[2] * local_ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    elif direction == 'diagonal':
        # Diagonal gradient from top-left to bottom-right
        max_dist = np.sqrt(width**2 + height**2)
        pixels = gradient.load()
        for y in range(height):
            for x in range(width):
                dist = np.sqrt(x**2 + y**2)
                ratio = min(dist / max_dist, 1.0)

                segment = ratio * (num_colors - 1)
                idx = int(segment)
                idx = min(idx, num_colors - 2)
                local_ratio = segment - idx

                color1, color2 = colors[idx], colors[idx + 1]
                r = int(color1[0] * (1 - local_ratio) + color2[0] * local_ratio)
                g = int(color1[1] * (1 - local_ratio) + color2[1] * local_ratio)
                b = int(color1[2] * (1 - local_ratio) + color2[2] * local_ratio)
                pixels[x, y] = (r, g, b)
    else:  # horizontal
        for x in range(width):
            ratio = x / width
            segment = ratio * (num_colors - 1)
            idx = int(segment)
            idx = min(idx, num_colors - 2)
            local_ratio = segment - idx

            color1, color2 = colors[idx], colors[idx + 1]
            r = int(color1[0] * (1 - local_ratio) + color2[0] * local_ratio)
            g = int(color1[1] * (1 - local_ratio) + color2[1] * local_ratio)
            b = int(color1[2] * (1 - local_ratio) + color2[2] * local_ratio)
            draw.line([(x, 0), (x, height)], fill=(r, g, b))

    return gradient

def add_noise_texture(image, intensity=15):
    """Add subtle noise texture for professional look"""
    img_array = np.array(image)
    noise = np.random.randint(-intensity, intensity, img_array.shape, dtype=np.int16)
    noisy = np.clip(img_array.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(noisy)

def add_vignette(image, intensity=0.3):
    """Add vignette effect (darker edges)"""
    width, height = image.size
    img_array = np.array(image).astype(np.float32)

    # Create vignette mask
    center_x, center_y = width // 2, height // 2
    max_dist = np.sqrt(center_x**2 + center_y**2)

    mask = np.zeros((height, width))
    for y in range(height):
        for x in range(width):
            dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            mask[y, x] = 1 - (dist / max_dist) * intensity

    # Apply vignette
    for c in range(3):
        img_array[:, :, c] *= mask

    return Image.fromarray(np.clip(img_array, 0, 255).astype(np.uint8))

def enhance_color_grading(image, vibrance=1.3, saturation=1.4, contrast=1.2, brightness=1.1):
    """
    Apply professional color grading to make thumbnails pop

    Args:
        image: PIL Image
        vibrance: Vibrance multiplier (1.0-2.0, default 1.3)
        saturation: Saturation multiplier (1.0-2.0, default 1.4)
        contrast: Contrast multiplier (1.0-2.0, default 1.2)
        brightness: Brightness multiplier (0.8-1.3, default 1.1)

    Returns:
        Enhanced PIL Image
    """
    print_log(f"🎨 Applying color grading: vibrance={vibrance}, saturation={saturation}, contrast={contrast}, brightness={brightness}")

    # Apply saturation (overall color intensity)
    enhancer = ImageEnhance.Color(image)
    image = enhancer.enhance(saturation)

    # Apply contrast (difference between light and dark)
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(contrast)

    # Apply brightness (overall lightness)
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(brightness)

    # Apply sharpness for extra crisp look
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.2)

    return image

def enhance_subject_only(composite_image, subject_rgba):
    """
    Apply enhanced color grading to subject only (not background)
    This makes the subject pop against the background

    Args:
        composite_image: Full composite PIL Image (RGB or RGBA)
        subject_rgba: Subject cutout PIL Image (RGBA)

    Returns:
        Enhanced composite PIL Image
    """
    print_log("✨ Enhancing subject with targeted color grading...")

    # Convert composite to RGBA if needed
    if composite_image.mode != 'RGBA':
        composite_image = composite_image.convert('RGBA')

    # Extract RGB from subject for enhancement
    subject_rgb = Image.new('RGB', subject_rgba.size, (255, 255, 255))
    subject_rgb.paste(subject_rgba, (0, 0), subject_rgba)

    # Apply stronger enhancement to subject
    enhanced_subject = enhance_color_grading(subject_rgb,
                                             vibrance=1.5,
                                             saturation=1.6,
                                             contrast=1.3,
                                             brightness=1.15)

    # Convert back to RGBA and preserve alpha
    enhanced_subject_rgba = enhanced_subject.convert('RGBA')
    enhanced_subject_rgba.putalpha(subject_rgba.split()[3])  # Restore original alpha

    # Composite enhanced subject back onto background
    result = composite_image.copy()
    result.paste(enhanced_subject_rgba, (0, 0), enhanced_subject_rgba)

    return result

def create_text_container(width, height, text, font, padding=40, corner_radius=30,
                          bg_color=(255, 255, 255, 240), shadow_offset=8, shadow_blur=15):
    """
    Create a rounded rectangle container for text (speech bubble style)

    Args:
        width: Container max width
        height: Container max height
        text: Text to measure
        font: PIL Font object
        padding: Inner padding around text
        corner_radius: Corner radius for rounded rectangle
        bg_color: Background color RGBA tuple
        shadow_offset: Drop shadow offset in pixels
        shadow_blur: Shadow blur radius

    Returns:
        PIL Image (RGBA) with text container and shadow
    """
    # Measure text size
    dummy_img = Image.new('RGBA', (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Container dimensions
    container_width = min(text_width + padding * 2, width)
    container_height = text_height + padding * 2

    # Create canvas with extra space for shadow
    canvas_width = container_width + shadow_offset + shadow_blur * 2
    canvas_height = container_height + shadow_offset + shadow_blur * 2
    container_img = Image.new('RGBA', (canvas_width, canvas_height), (0, 0, 0, 0))

    # Draw shadow first
    shadow_layer = Image.new('RGBA', (canvas_width, canvas_height), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_x = shadow_blur + shadow_offset
    shadow_y = shadow_blur + shadow_offset
    shadow_draw.rounded_rectangle(
        [(shadow_x, shadow_y), (shadow_x + container_width, shadow_y + container_height)],
        radius=corner_radius,
        fill=(0, 0, 0, 120)  # Semi-transparent black shadow
    )
    # Blur the shadow
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=shadow_blur))
    container_img = Image.alpha_composite(container_img, shadow_layer)

    # Draw container
    draw = ImageDraw.Draw(container_img)
    box_x = shadow_blur
    box_y = shadow_blur
    draw.rounded_rectangle(
        [(box_x, box_y), (box_x + container_width, box_y + container_height)],
        radius=corner_radius,
        fill=bg_color
    )

    # Draw text centered in container
    text_x = box_x + (container_width - text_width) // 2
    text_y = box_y + (container_height - text_height) // 2
    draw.text((text_x, text_y), text, font=font, fill=(0, 0, 0, 255))  # Black text

    return container_img, (text_x, text_y)

def create_brand_gradient_background(width, height, brand_colors, style='vibrant'):
    """
    Create vibrant solid or gradient background using brand colors

    Args:
        width: Background width
        height: Background height
        brand_colors: List of RGB tuples from brand kit
        style: 'solid', 'vibrant', 'diagonal', 'radial'

    Returns:
        PIL Image (RGB) background
    """
    print_log(f"🎨 Creating brand gradient background: style={style}, colors={brand_colors}")

    if style == 'solid':
        # Use first brand color as solid background
        bg = Image.new('RGB', (width, height), brand_colors[0])
        return bg

    elif style == 'vibrant' or style == 'diagonal':
        # Create vibrant diagonal gradient with brand colors
        # Enhance colors for maximum pop
        enhanced_colors = []
        for color in brand_colors:
            # Increase saturation by 20%
            r, g, b = color
            # Convert to HSV to boost saturation
            hsv = cv2.cvtColor(np.uint8([[[r, g, b]]]), cv2.COLOR_RGB2HSV)[0][0]
            hsv[1] = min(255, int(hsv[1] * 1.2))  # Boost saturation
            hsv[2] = min(255, int(hsv[2] * 1.1))  # Slight brightness boost
            rgb = cv2.cvtColor(np.uint8([[[hsv[0], hsv[1], hsv[2]]]]), cv2.COLOR_HSV2RGB)[0][0]
            enhanced_colors.append(tuple(rgb))

        bg = create_multi_gradient(width, height, enhanced_colors, 'diagonal')
        bg = add_noise_texture(bg, intensity=8)
        return bg

    elif style == 'radial':
        # Radial gradient from center color to edge color
        if len(brand_colors) >= 2:
            bg = create_radial_gradient(width, height, brand_colors[0], brand_colors[-1])
        else:
            # Darken the color for edges
            r, g, b = brand_colors[0]
            edge_color = (max(0, r-50), max(0, g-50), max(0, b-50))
            bg = create_radial_gradient(width, height, brand_colors[0], edge_color)
        bg = add_noise_texture(bg, intensity=8)
        return bg

    else:
        # Default: vertical gradient
        bg = create_multi_gradient(width, height, brand_colors, 'vertical')
        bg = add_noise_texture(bg, intensity=8)
        return bg

def create_geometric_pattern_background(width, height, brand_colors, pattern='hexagons'):
    """
    Create geometric pattern backgrounds (hexagons, dots, stripes) for modern professional look

    Args:
        width: Background width
        height: Background height
        brand_colors: List of RGB tuples from brand kit
        pattern: 'hexagons', 'dots', 'stripes', 'diagonal_stripes'

    Returns:
        PIL Image (RGB) background
    """
    print_log(f"🔷 Creating geometric pattern background: {pattern}")

    # Start with vibrant gradient base
    bg = create_brand_gradient_background(width, height, brand_colors, style='diagonal')
    bg_array = np.array(bg)

    if pattern == 'hexagons':
        # Add hexagon pattern overlay
        hex_size = int(min(width, height) * 0.08)  # Hexagon size
        spacing = int(hex_size * 1.8)

        # Create overlay layer
        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # Draw hexagons in grid pattern
        for y in range(-hex_size, height + hex_size, spacing):
            for x in range(-hex_size, width + hex_size, int(spacing * 0.866)):
                # Offset every other row
                x_offset = int(spacing * 0.433) if (y // spacing) % 2 == 1 else 0
                center_x = x + x_offset
                center_y = y

                # Create hexagon points
                points = []
                for i in range(6):
                    angle = np.pi / 3 * i
                    px = center_x + hex_size * 0.5 * np.cos(angle)
                    py = center_y + hex_size * 0.5 * np.sin(angle)
                    points.append((px, py))

                # Draw hexagon outline in contrasting color
                overlay_draw.polygon(points, outline=(255, 255, 255, 40), width=2)

        # Composite overlay
        bg_rgba = bg.convert('RGBA')
        bg_rgba = Image.alpha_composite(bg_rgba, overlay)
        return bg_rgba.convert('RGB')

    elif pattern == 'dots':
        # Add dot pattern overlay
        dot_size = int(min(width, height) * 0.025)
        spacing = int(dot_size * 4)

        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        for y in range(0, height, spacing):
            for x in range(0, width, spacing):
                # Offset every other row
                x_offset = spacing // 2 if (y // spacing) % 2 == 1 else 0
                dot_x = x + x_offset
                dot_y = y

                # Draw dot
                overlay_draw.ellipse(
                    [(dot_x - dot_size, dot_y - dot_size),
                     (dot_x + dot_size, dot_y + dot_size)],
                    fill=(255, 255, 255, 50)
                )

        bg_rgba = bg.convert('RGBA')
        bg_rgba = Image.alpha_composite(bg_rgba, overlay)
        return bg_rgba.convert('RGB')

    elif pattern == 'stripes':
        # Horizontal stripes
        stripe_height = int(height * 0.1)

        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        for y in range(0, height, stripe_height * 2):
            overlay_draw.rectangle(
                [(0, y), (width, y + stripe_height)],
                fill=(255, 255, 255, 25)
            )

        bg_rgba = bg.convert('RGBA')
        bg_rgba = Image.alpha_composite(bg_rgba, overlay)
        return bg_rgba.convert('RGB')

    elif pattern == 'diagonal_stripes':
        # Diagonal stripes for dynamic look
        stripe_width = int(min(width, height) * 0.12)

        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # Draw diagonal stripes from top-left to bottom-right
        diagonal_length = int(np.sqrt(width**2 + height**2))
        for i in range(-diagonal_length, diagonal_length, stripe_width * 2):
            # Calculate stripe coordinates
            x1, y1 = i, 0
            x2, y2 = i + height, height

            # Draw stripe as thick line
            for offset in range(stripe_width):
                overlay_draw.line(
                    [(x1 + offset, y1), (x2 + offset, y2)],
                    fill=(255, 255, 255, 20),
                    width=2
                )

        bg_rgba = bg.convert('RGBA')
        bg_rgba = Image.alpha_composite(bg_rgba, overlay)
        return bg_rgba.convert('RGB')

    else:
        return bg

def enhance_skin_tones(image_rgba):
    """
    Advanced skin tone enhancement for professional portrait quality

    Args:
        image_rgba: PIL Image (RGBA) with subject

    Returns:
        PIL Image (RGBA) with enhanced skin tones
    """
    print_log("👤 Applying advanced skin tone enhancement...")

    img_array = np.array(image_rgba)
    rgb = img_array[:, :, :3]
    alpha = img_array[:, :, 3]

    # Convert to HSV for better skin tone detection
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)

    # Define skin tone range in HSV (covers various skin tones)
    # Hue: 0-50 (red-orange-yellow range)
    # Saturation: 20-200 (not too gray, not too saturated)
    # Value: 35-255 (avoid very dark shadows)
    lower_skin = np.array([0, 20, 35], dtype=np.uint8)
    upper_skin = np.array([50, 200, 255], dtype=np.uint8)

    # Create skin mask
    skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)

    # Refine mask with morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)

    # Blur mask for smooth transitions
    skin_mask = cv2.GaussianBlur(skin_mask, (15, 15), 0)

    # Convert mask to 0-1 range
    skin_mask_normalized = skin_mask.astype(np.float32) / 255.0

    # Enhance skin areas
    enhanced_rgb = rgb.copy().astype(np.float32)

    # 1. Slightly increase brightness in skin areas (+5-10%)
    brightness_boost = 1.08
    for c in range(3):
        enhanced_rgb[:, :, c] = rgb[:, :, c] * (1 + (brightness_boost - 1) * skin_mask_normalized)

    # 2. Reduce saturation slightly for natural look (-5%)
    enhanced_hsv = cv2.cvtColor(enhanced_rgb.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    enhanced_hsv[:, :, 1] = enhanced_hsv[:, :, 1] * (1 - 0.05 * skin_mask_normalized)

    # 3. Add slight warmth (shift hue toward red/orange)
    hue_shift = -2  # Shift toward warmer tones
    enhanced_hsv[:, :, 0] = np.clip(enhanced_hsv[:, :, 0] + hue_shift * skin_mask_normalized, 0, 179)

    # Convert back to RGB
    enhanced_rgb = cv2.cvtColor(enhanced_hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)

    # Combine with original alpha
    result_array = np.dstack([enhanced_rgb, alpha])
    result = Image.fromarray(result_array, 'RGBA')

    print_log("✓ Skin tones enhanced (brightness +8%, warmth added)")
    return result

def create_creative_background(original_image, bg_type='gradient', brand_kit_options=None):
    """Create professional YouTube-quality backgrounds for thumbnails"""
    width, height = original_image.size

    # PRIORITY: Use brand colors if available (replace blur with vibrant brand gradient)
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        print_log("🎨 Using BRAND COLORS for background instead of blur/default")
        brand_colors = brand_kit_options['gradient_colors']

        # Check if geometric pattern is requested
        if bg_type.startswith('pattern_'):
            pattern_type = bg_type.replace('pattern_', '')
            return create_geometric_pattern_background(width, height, brand_colors, pattern=pattern_type)
        else:
            # Always use vibrant diagonal gradient for brand colors (most professional look)
            return create_brand_gradient_background(width, height, brand_colors, style='vibrant')

    if bg_type == 'gradient_blue':
        # Modern YouTube blue-purple gradient with depth
        bg = create_multi_gradient(width, height, [
            (15, 32, 39),      # Dark blue-gray
            (32, 58, 67),      # Medium blue
            (44, 83, 100),     # Bright blue
            (65, 105, 225),    # Royal blue
            (123, 104, 238)    # Medium purple
        ], 'diagonal')
        bg = add_noise_texture(bg, intensity=8)
        return add_vignette(bg, intensity=0.2)

    elif bg_type == 'gradient_fire':
        # Intense fire/energy gradient (MrBeast style)
        bg = create_multi_gradient(width, height, [
            (26, 9, 2),        # Dark burgundy
            (139, 0, 0),       # Dark red
            (255, 69, 0),      # Red-orange
            (255, 140, 0),     # Dark orange
            (255, 215, 0)      # Gold
        ], 'vertical')
        bg = add_noise_texture(bg, intensity=10)
        return add_vignette(bg, intensity=0.25)

    elif bg_type == 'gradient_ocean':
        # Deep ocean gradient with radial center
        bg = create_radial_gradient(width, height,
            (64, 224, 208),    # Turquoise center
            (0, 47, 75)        # Deep blue edges
        )
        # Add secondary gradient overlay
        overlay = create_multi_gradient(width, height, [
            (11, 72, 107),
            (17, 106, 157),
            (34, 167, 240),
            (59, 189, 159)
        ], 'vertical')
        overlay = ImageEnhance.Brightness(overlay).enhance(0.7)
        # Blend
        bg = Image.blend(bg, overlay, 0.5)
        bg = add_noise_texture(bg, intensity=8)
        return add_vignette(bg, intensity=0.15)

    elif bg_type == 'gradient_sunset':
        # Vibrant sunset gradient (Instagram style)
        bg = create_multi_gradient(width, height, [
            (253, 29, 29),     # Red
            (252, 176, 69),    # Orange
            (255, 222, 89),    # Yellow
            (131, 58, 180),    # Purple
            (88, 81, 219)      # Blue-purple
        ], 'diagonal')
        bg = add_noise_texture(bg, intensity=10)
        return add_vignette(bg, intensity=0.2)

    elif bg_type == 'gradient_dark':
        # Professional dark gradient (tech/gaming style)
        bg = create_multi_gradient(width, height, [
            (10, 10, 15),      # Almost black
            (25, 25, 35),      # Dark gray
            (45, 45, 60),      # Medium dark
            (30, 30, 45)       # Back to dark
        ], 'vertical')
        # Add radial light in center
        radial = create_radial_gradient(width, height,
            (80, 80, 120),     # Light center
            (10, 10, 15)       # Dark edges
        )
        bg = Image.blend(bg, radial, 0.3)
        bg = add_noise_texture(bg, intensity=12)
        return bg

    elif bg_type == 'gradient_neon':
        # Neon cyberpunk gradient
        bg = create_multi_gradient(width, height, [
            (15, 12, 41),      # Deep purple-black
            (48, 43, 99),      # Dark purple
            (36, 36, 62),      # Blue-gray
            (237, 33, 124),    # Hot pink
            (0, 255, 255)      # Cyan
        ], 'diagonal')
        bg = add_noise_texture(bg, intensity=15)
        return add_vignette(bg, intensity=0.3)

    elif bg_type == 'gradient_vibrant':
        # Ultra vibrant multi-color (clickbait style)
        bg = create_multi_gradient(width, height, [
            (255, 0, 128),     # Hot pink
            (255, 204, 0),     # Bright yellow
            (0, 255, 127),     # Spring green
            (0, 191, 255),     # Deep sky blue
            (138, 43, 226)     # Blue violet
        ], 'horizontal')
        bg = add_noise_texture(bg, intensity=12)
        return add_vignette(bg, intensity=0.2)

    elif bg_type == 'blur':
        # Heavily blurred original with enhancement
        bg = original_image.filter(ImageFilter.GaussianBlur(radius=60))
        # Increase saturation for more impact
        enhancer = ImageEnhance.Color(bg)
        bg = enhancer.enhance(1.5)
        # Add slight vignette
        return add_vignette(bg, intensity=0.2)

    elif bg_type == 'blur_dark':
        # Blurred + darkened with dramatic vignette
        bg = original_image.filter(ImageFilter.GaussianBlur(radius=50))
        enhancer = ImageEnhance.Brightness(bg)
        bg = enhancer.enhance(0.35)
        bg = add_noise_texture(bg, intensity=10)
        return add_vignette(bg, intensity=0.4)

    else:  # default modern gradient
        return create_multi_gradient(width, height, [
            (20, 20, 30),
            (40, 40, 55),
            (30, 30, 45)
        ], 'vertical')

def refine_alpha_edges(person_rgba, feather_radius=5, edge_cleanup=True):
    """
    Refine alpha channel edges for professional background removal quality

    Args:
        person_rgba: PIL Image (RGBA) with person cutout
        feather_radius: Radius for edge feathering (softening)
        edge_cleanup: Apply morphological operations to clean up edges

    Returns:
        PIL Image (RGBA) with refined edges
    """
    print_log("🔧 Refining alpha channel edges...")

    # Convert to numpy for processing
    img_array = np.array(person_rgba)
    alpha = img_array[:, :, 3]

    if edge_cleanup:
        # Morphological operations to clean up edge artifacts
        # 1. Slight erosion to remove small artifacts
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        alpha_eroded = cv2.erode(alpha, kernel_small, iterations=1)

        # 2. Slight dilation to restore edge
        kernel_medium = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        alpha_cleaned = cv2.dilate(alpha_eroded, kernel_medium, iterations=1)
    else:
        alpha_cleaned = alpha

    # Apply gaussian blur for edge feathering
    if feather_radius > 0:
        alpha_feathered = cv2.GaussianBlur(alpha_cleaned, (feather_radius * 2 + 1, feather_radius * 2 + 1), 0)
    else:
        alpha_feathered = alpha_cleaned

    # Update alpha channel
    img_array[:, :, 3] = alpha_feathered

    refined = Image.fromarray(img_array, 'RGBA')
    print_log(f"✓ Edges refined (feather={feather_radius}px, cleanup={edge_cleanup})")

    return refined

def add_rim_lighting(person_rgba, light_color=(255, 255, 255), intensity=0.6, thickness=3):
    """
    Add rim lighting (edge glow) effect to subject for professional separation from background

    Args:
        person_rgba: PIL Image (RGBA) with person cutout
        light_color: RGB color tuple for rim light
        intensity: Intensity of rim light (0-1)
        thickness: Thickness of rim light in pixels

    Returns:
        PIL Image (RGBA) with rim lighting applied
    """
    print_log(f"💡 Adding rim lighting (color={light_color}, intensity={intensity})...")

    # Convert to numpy
    img_array = np.array(person_rgba)
    alpha = img_array[:, :, 3]

    # Find edges using Sobel operator on alpha channel
    edges_x = cv2.Sobel(alpha, cv2.CV_64F, 1, 0, ksize=3)
    edges_y = cv2.Sobel(alpha, cv2.CV_64F, 0, 1, ksize=3)
    edges = np.sqrt(edges_x**2 + edges_y**2)

    # Normalize edges
    edges = np.clip(edges / edges.max() * 255, 0, 255).astype(np.uint8)

    # Dilate edges to make rim thicker
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (thickness * 2 + 1, thickness * 2 + 1))
    edges_thick = cv2.dilate(edges, kernel, iterations=1)

    # Blur for softer rim
    edges_soft = cv2.GaussianBlur(edges_thick, (7, 7), 0)

    # Create rim lighting layer
    rim_layer = np.zeros_like(img_array)
    for c in range(3):
        rim_layer[:, :, c] = (edges_soft / 255.0 * light_color[c] * intensity).astype(np.uint8)
    rim_layer[:, :, 3] = edges_soft

    # Composite rim light onto subject
    rim_img = Image.fromarray(rim_layer, 'RGBA')
    result = Image.alpha_composite(person_rgba, rim_img)

    print_log("✓ Rim lighting applied")
    return result

def remove_background_and_composite(image_path, bg_type='gradient_blue', enable_edge_refinement=True, enable_rim_light=True, brand_kit_options=None):
    """
    Remove background from person and composite onto creative background with professional edge quality

    Args:
        image_path: Path to source image
        bg_type: Background type to use
        enable_edge_refinement: Apply edge feathering and cleanup
        enable_rim_light: Add rim lighting for subject separation
        brand_kit_options: Brand kit options for background colors

    Returns:
        PIL Image (RGB) with background replaced and professional edges
    """
    if not REMBG_AVAILABLE:
        print_log("⚠ WARNING: rembg not available, skipping background removal")
        return Image.open(image_path).convert('RGB')

    print_log(f"🎨 Removing background and applying {bg_type} background...")

    # Load original image
    original = Image.open(image_path).convert('RGB')
    print_log(f"📐 Image size: {original.size}")

    # Remove background to get person with alpha channel
    try:
        print_log("🤖 Running AI background removal (this may take 10-20 seconds)...")
        person_rgba = remove(original)
        print_log(f"✓ Background removed successfully, alpha channel: {person_rgba.mode}")

        # Apply professional edge refinement with enhanced feathering
        if enable_edge_refinement:
            person_rgba = refine_alpha_edges(person_rgba, feather_radius=7, edge_cleanup=True)

        # Apply advanced skin tone enhancement for professional portrait quality
        person_rgba = enhance_skin_tones(person_rgba)

        # Add rim lighting for professional separation
        if enable_rim_light:
            # Detect background color to choose appropriate rim light color
            # For now, use white rim light (works well with most backgrounds)
            person_rgba = add_rim_lighting(person_rgba, light_color=(255, 255, 255), intensity=0.5, thickness=2)

        # Create creative background (will use brand colors if available)
        print_log(f"🎨 Creating {bg_type} background...")
        background = create_creative_background(original, bg_type, brand_kit_options)

        # Composite person onto background
        result = background.copy()
        result.paste(person_rgba, (0, 0), person_rgba)
        print_log("✓ Person composited onto new background")

        # Apply subject-specific color grading for professional look
        result_rgba = result.convert('RGBA')
        result_rgba = enhance_subject_only(result_rgba, person_rgba)

        # Add subtle edge glow effect for extra pop
        print_log("✨ Adding edge glow effect...")
        # Create a slightly larger, blurred version for glow
        glow = person_rgba.filter(ImageFilter.GaussianBlur(radius=8))
        glow_layer = Image.new('RGBA', result_rgba.size, (255, 255, 255, 0))
        glow_layer.paste(glow, (0, 0))

        # Composite glow with reduced opacity
        glow_array = np.array(glow_layer)
        glow_array[:, :, 3] = (glow_array[:, :, 3] * 0.3).astype(np.uint8)  # 30% opacity
        glow_layer = Image.fromarray(glow_array, 'RGBA')

        # Composite layers: background -> glow -> person (result_rgba already has enhanced subject)
        result_rgba = Image.alpha_composite(result_rgba, glow_layer)

        # Apply final global color grading for maximum pop
        result_rgb = result_rgba.convert('RGB')
        result_rgb = enhance_color_grading(result_rgb, vibrance=1.3, saturation=1.4, contrast=1.2, brightness=1.1)

        print_log("✓ Background replacement complete with professional color grading!")
        return result_rgb

    except Exception as e:
        print_log(f"❌ Background removal failed: {type(e).__name__}: {e}")
        import traceback
        print_log(traceback.format_exc())
        print_log("⚠ Falling back to original image")
        return original

def auto_select_template_and_background(image_path):
    """Intelligently select best template and background based on image content"""
    print_log("🤖 Auto-selecting best template and background...")

    # Load image
    img_cv = cv2.imread(image_path)
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

    # Detect faces
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    has_faces = len(faces) > 0
    num_faces = len(faces)

    # Calculate image stats
    brightness = np.mean(gray)
    contrast = np.std(gray)

    print_log(f"  Faces detected: {num_faces}")
    print_log(f"  Brightness: {brightness:.1f}, Contrast: {contrast:.1f}")

    # Smart selection logic based on content and style
    if has_faces and num_faces >= 1:
        # Person in frame - use dramatic backgrounds for maximum impact
        if brightness > 140:  # Very bright image
            background = 'gradient_vibrant'  # Ultra eye-catching
            template = 'mrbeast'  # Maximum clickbait
        elif brightness > 110:  # Medium-bright image
            background = 'gradient_fire'  # High energy MrBeast style
            template = 'dramatic'  # Bold text
        else:  # Darker image
            if contrast > 50:  # High contrast
                background = 'gradient_neon'  # Cyberpunk vibes
                template = 'mrbeast'  # Bold energy
            else:
                background = 'gradient_sunset'  # Warm and inviting
                template = 'dramatic'  # Prominent text
    else:
        # No faces - product/tech/scenery shots
        if contrast > 60:  # High detail/contrast
            background = 'gradient_dark'  # Professional tech style
            template = 'tech'  # Clean modern
        else:
            background = 'blur_dark'  # Artistic dramatic
            template = 'tutorial'  # Clear and instructional

    print_log(f"✓ Auto-selected: template={template}, background={background}")
    print_log(f"  Reasoning: faces={has_faces}, brightness={brightness:.1f}, contrast={contrast:.1f}")
    return template, background

def add_text_overlay(image_path, text, template, output_path, background_type=None, brand_kit_options=None):
    """
    Add text overlay to image using specified template with smart positioning and optional brand kit styling

    Args:
        image_path: Path to source image
        text: Text to overlay
        template: Template style to use
        output_path: Output file path
        background_type: Background replacement type (optional)
        brand_kit_options: Brand kit styling options (optional)

    Returns:
        Path to output file
    """
    print_log(f"Adding text overlay with template: {template}")

    # First, detect faces in original image for smart positioning
    print_log("🎯 Calculating optimal text position...")
    img_cv = cv2.imread(image_path)
    face_count, faces = detect_faces(img_cv)
    print_log(f"  Detected {face_count} face(s)")

    # Calculate optimal text position (initially estimate 1-2 lines)
    positioning = calculate_optimal_text_position(img_cv, faces, text_lines=2, preferred_position='auto')

    # Apply brand kit font size multiplier if present
    if brand_kit_options and 'font_size_multiplier' in brand_kit_options:
        positioning['font_size_multiplier'] *= brand_kit_options['font_size_multiplier']
        print_log(f"🎨 Applying brand kit font size: {positioning['font_size_multiplier']:.2f}x")

    # Apply background removal if requested
    if background_type and background_type != 'original':
        img = remove_background_and_composite(image_path, background_type,
                                              enable_edge_refinement=True,
                                              enable_rim_light=True,
                                              brand_kit_options=brand_kit_options)
    else:
        # Open image normally
        img = Image.open(image_path)
        img = img.convert('RGB')
        # Apply global color grading even without background removal for vibrant look
        img = enhance_color_grading(img, vibrance=1.2, saturation=1.3, contrast=1.15, brightness=1.05)

    # Create drawing context
    draw = ImageDraw.Draw(img)

    # Template styles with smart positioning and brand kit options
    print_log(f"📝 Applying {template} template with smart positioning...")
    if template == 'professional':
        apply_professional_style(img, draw, text, positioning, brand_kit_options)
    elif template == 'mrbeast':
        apply_mrbeast_style(img, draw, text, positioning, brand_kit_options)
    elif template == 'tech':
        apply_tech_style(img, draw, text, positioning, brand_kit_options)
    elif template == 'vlog':
        apply_vlog_style(img, draw, text, positioning, brand_kit_options)
    elif template == 'tutorial':
        apply_tutorial_style(img, draw, text, positioning, brand_kit_options)
    elif template == 'dramatic':
        apply_dramatic_style(img, draw, text, positioning, brand_kit_options)
    elif template == 'diagonal':
        apply_diagonal_style(img, draw, text, positioning, brand_kit_options)
    elif template == 'splitscreen':
        apply_splitscreen_style(img, draw, text, positioning, brand_kit_options)
    else:
        # Default: use professional style
        apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Save result
    img.save(output_path, 'PNG', quality=95)
    print_log(f"✓ Thumbnail saved to: {output_path}")

    return output_path

def get_font(size, bold=True, emoji=False):
    """Get professional font with fallback options, including emoji support"""

    if emoji:
        # Emoji fonts in order of preference
        emoji_fonts = [
            # Noto Color Emoji (recommended, install via: sudo apt install fonts-noto-color-emoji)
            "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
            # Noto Emoji (monochrome fallback)
            "/usr/share/fonts/truetype/noto/NotoEmoji-Regular.ttf",
            # Apple Color Emoji (macOS)
            "/System/Library/Fonts/Apple Color Emoji.ttc",
            # Segoe UI Emoji (Windows)
            "/Windows/Fonts/seguiemj.ttf",
        ]

        for font_path in emoji_fonts:
            try:
                font = ImageFont.truetype(font_path, size)
                print_log(f"✓ Using emoji font: {font_path.split('/')[-1]}")
                return font
            except Exception:
                continue

        print_log("⚠ No emoji font found, using regular font")
        # Fall through to regular fonts if no emoji font available

    # Professional YouTube-quality fonts in order of preference
    font_names = [
        # Liberation Sans (installed via apt)
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        # Ubuntu fonts
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-Bold.ttf",
        # DejaVu fallback
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        # System fallbacks
        "/System/Library/Fonts/Helvetica.ttc",
        "/Windows/Fonts/Arial.ttf",
        "arial.ttf"
    ]

    for font_name in font_names:
        try:
            font = ImageFont.truetype(font_name, size)
            print_log(f"✓ Using font: {font_name.split('/')[-1]}")
            return font
        except Exception:
            continue

    # Fallback to default
    print_log("⚠ Using default font (fallback)")
    return ImageFont.load_default()

def has_emoji(text):
    """Check if text contains emoji characters"""
    import re
    # Unicode ranges for emoji characters
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"  # enclosed characters
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"  # extended pictographs
        "]+",
        flags=re.UNICODE
    )
    return bool(emoji_pattern.search(text))

def split_text_and_emoji(text):
    """
    Split text into segments of regular text and emoji characters

    Returns:
        List of tuples: [(text_segment, is_emoji), ...]
    """
    import re
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"
        "\U0001FA00-\U0001FA6F"
        "]+",
        flags=re.UNICODE
    )

    segments = []
    last_end = 0

    for match in emoji_pattern.finditer(text):
        # Add regular text before emoji (if any)
        if match.start() > last_end:
            segments.append((text[last_end:match.start()], False))

        # Add emoji segment
        segments.append((match.group(), True))
        last_end = match.end()

    # Add remaining regular text (if any)
    if last_end < len(text):
        segments.append((text[last_end:], False))

    return segments

def render_text_with_emoji(text, font_size, regular_font, gradient_colors=None, fill_color=None):
    """
    Render text with proper emoji support by using separate fonts

    Args:
        text: Text to render (may contain emojis)
        font_size: Font size for rendering
        regular_font: Font object for regular text
        gradient_colors: List of RGB tuples for gradient (optional)
        fill_color: Solid fill color (optional, used if gradient_colors is None)

    Returns:
        PIL Image (RGBA) with rendered text including emojis
    """
    if not has_emoji(text):
        # No emojis, use regular rendering
        if gradient_colors:
            return create_text_gradient(text, regular_font, gradient_colors, 'vertical')
        else:
            # Simple solid color text
            bbox = regular_font.getbbox(text)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            img = Image.new('RGBA', (text_width, text_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            draw.text((-bbox[0], -bbox[1]), text, font=regular_font, fill=fill_color or (255, 255, 255))
            return img

    # Text contains emojis - render with mixed fonts
    segments = split_text_and_emoji(text)
    emoji_font = get_font(font_size, emoji=True)

    # Calculate total width
    total_width = 0
    max_height = 0
    segment_widths = []

    for segment_text, is_emoji in segments:
        font = emoji_font if is_emoji else regular_font
        bbox = font.getbbox(segment_text)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        segment_widths.append(width)
        total_width += width
        max_height = max(max_height, height)

    # Create canvas
    result = Image.new('RGBA', (total_width, max_height), (0, 0, 0, 0))

    # Render each segment
    x_offset = 0
    for i, (segment_text, is_emoji) in enumerate(segments):
        font = emoji_font if is_emoji else regular_font

        if is_emoji:
            # Render emoji with regular fill
            segment_img = Image.new('RGBA', (segment_widths[i], max_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(segment_img)
            draw.text((0, 0), segment_text, font=font, fill=fill_color or (255, 255, 255), embedded_color=True)
        else:
            # Render regular text with gradient
            if gradient_colors:
                segment_img = create_text_gradient(segment_text, font, gradient_colors, 'vertical')
            else:
                bbox = font.getbbox(segment_text)
                segment_img = Image.new('RGBA', (segment_widths[i], max_height), (0, 0, 0, 0))
                draw = ImageDraw.Draw(segment_img)
                draw.text((-bbox[0], -bbox[1]), segment_text, font=font, fill=fill_color or (255, 255, 255))

        # Composite segment onto result
        result.paste(segment_img, (x_offset, 0), segment_img)
        x_offset += segment_widths[i]

    return result

def create_text_gradient(text, font, gradient_colors, direction='vertical'):
    """
    Create a gradient-filled text image

    Args:
        text: Text to render
        font: PIL Font object
        gradient_colors: List of RGB tuples [(r,g,b), (r,g,b), ...]
        direction: 'vertical', 'horizontal', or 'diagonal'

    Returns:
        PIL Image with gradient text (RGBA)
    """
    # Get text bounding box
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Create a transparent image for text mask
    text_mask = Image.new('L', (text_width, text_height), 0)
    mask_draw = ImageDraw.Draw(text_mask)
    mask_draw.text((-bbox[0], -bbox[1]), text, font=font, fill=255)

    # Create gradient background
    gradient = create_multi_gradient(text_width, text_height, gradient_colors, direction)

    # Apply text mask to gradient
    result = Image.new('RGBA', (text_width, text_height), (0, 0, 0, 0))
    result.paste(gradient, (0, 0))
    result.putalpha(text_mask)

    return result

def create_curved_arrow(size=(300, 300), color=(255, 50, 50), direction='right', thickness=30, glow=True):
    """
    Create a professional curved arrow graphic (MrBeast style)

    Args:
        size: (width, height) of the canvas
        color: RGB color tuple for the arrow
        direction: 'right', 'left', 'up', 'down', 'up-right', 'down-right'
        thickness: Thickness of the arrow stroke
        glow: Add glow effect around arrow

    Returns:
        PIL Image (RGBA) with curved arrow
    """
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    width, height = size
    center_x, center_y = width // 2, height // 2

    # Define arrow paths based on direction
    if direction == 'right':
        # Curved arrow pointing right
        curve_start = (int(width * 0.2), center_y)
        curve_end = (int(width * 0.8), center_y)
        # Draw curved line (arc approximation)
        for i in range(50):
            t = i / 50
            x = int(curve_start[0] + (curve_end[0] - curve_start[0]) * t)
            y = int(curve_start[1] - 80 * np.sin(t * np.pi))  # Curved path
            draw.ellipse([(x - thickness//2, y - thickness//2),
                         (x + thickness//2, y + thickness//2)],
                        fill=color)
        # Arrow head (triangle)
        arrow_tip = curve_end
        head_size = int(thickness * 2)
        arrow_head = [
            arrow_tip,
            (arrow_tip[0] - head_size, arrow_tip[1] - head_size),
            (arrow_tip[0] - head_size, arrow_tip[1] + head_size)
        ]
        draw.polygon(arrow_head, fill=color)

    elif direction == 'down-right':
        # Curved arrow pointing down-right (common for highlighting)
        curve_start = (int(width * 0.2), int(height * 0.2))
        curve_end = (int(width * 0.7), int(height * 0.7))
        # Bezier curve approximation
        for i in range(50):
            t = i / 50
            x = int(curve_start[0] + (curve_end[0] - curve_start[0]) * t)
            y = int(curve_start[1] + (curve_end[1] - curve_start[1]) * t * t)
            draw.ellipse([(x - thickness//2, y - thickness//2),
                         (x + thickness//2, y + thickness//2)],
                        fill=color)
        # Arrow head
        arrow_tip = curve_end
        head_size = int(thickness * 2)
        arrow_head = [
            arrow_tip,
            (arrow_tip[0] - head_size, arrow_tip[1] - head_size//2),
            (arrow_tip[0] - head_size//2, arrow_tip[1] - head_size)
        ]
        draw.polygon(arrow_head, fill=color)

    # Add glow effect
    if glow:
        img = img.filter(ImageFilter.GaussianBlur(radius=2))
        # Layer original on top for sharp core
        sharp = Image.new('RGBA', size, (0, 0, 0, 0))
        sharp_draw = ImageDraw.Draw(sharp)
        # Redraw arrow on sharp layer (simplified)
        img = Image.alpha_composite(img, sharp)

    return img

def create_circle_highlight(size=(400, 400), color=(255, 255, 0), thickness=20, style='solid'):
    """
    Create a circle highlight/attention marker (common in YouTube thumbnails)

    Args:
        size: (width, height) of the canvas
        color: RGB color tuple for the circle
        thickness: Thickness of the circle stroke
        style: 'solid', 'dashed', 'pulsing' (with glow effect)

    Returns:
        PIL Image (RGBA) with circle highlight
    """
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    width, height = size
    center_x, center_y = width // 2, height // 2
    radius = min(width, height) // 2 - thickness - 10

    if style == 'pulsing':
        # Create pulsing effect with multiple circles
        for i in range(3):
            alpha = 255 - (i * 60)
            offset = i * 15
            color_with_alpha = color + (alpha,)
            draw.ellipse([
                (center_x - radius - offset, center_y - radius - offset),
                (center_x + radius + offset, center_y + radius + offset)
            ], outline=color_with_alpha, width=thickness - i * 5)

    elif style == 'dashed':
        # Dashed circle (draw arc segments)
        dash_length = 30
        for angle in range(0, 360, dash_length * 2):
            draw.arc([
                (center_x - radius, center_y - radius),
                (center_x + radius, center_y + radius)
            ], start=angle, end=angle + dash_length, fill=color, width=thickness)

    else:  # solid
        draw.ellipse([
            (center_x - radius, center_y - radius),
            (center_x + radius, center_y + radius)
        ], outline=color, width=thickness)

    return img

def create_rectangle_frame(size=(500, 350), color=(255, 0, 0), thickness=15, corner_radius=30):
    """
    Create a rectangle frame/border (for highlighting sections)

    Args:
        size: (width, height) of the rectangle
        color: RGB color tuple
        thickness: Border thickness
        corner_radius: Corner rounding radius

    Returns:
        PIL Image (RGBA) with rectangle frame
    """
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    width, height = size

    # Draw rounded rectangle outline
    draw.rounded_rectangle(
        [(thickness//2, thickness//2), (width - thickness//2, height - thickness//2)],
        radius=corner_radius,
        outline=color,
        width=thickness
    )

    return img

def create_explosion_starburst(size=(400, 400), color=(255, 215, 0), num_points=16):
    """
    Create an explosion/starburst shape (for emphasis/impact)

    Args:
        size: (width, height) of the canvas
        color: RGB color tuple
        num_points: Number of burst points

    Returns:
        PIL Image (RGBA) with starburst shape
    """
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    width, height = size
    center_x, center_y = width // 2, height // 2
    outer_radius = min(width, height) // 2 - 20
    inner_radius = outer_radius // 3

    # Create star burst points
    points = []
    for i in range(num_points * 2):
        angle = (i * 180 / num_points) * (np.pi / 180)
        radius = outer_radius if i % 2 == 0 else inner_radius
        x = center_x + int(radius * np.cos(angle))
        y = center_y + int(radius * np.sin(angle))
        points.append((x, y))

    # Draw filled polygon
    draw.polygon(points, fill=color + (200,))

    # Add glow
    img = img.filter(ImageFilter.GaussianBlur(radius=3))

    return img

def create_badge_banner(size=(600, 200), text="NEW!", color=(255, 50, 50), style='ribbon'):
    """
    Create a badge or banner graphic (for "NEW", "SALE", etc.)

    Args:
        size: (width, height) of the banner
        text: Text to display on banner
        color: RGB color tuple for banner background
        style: 'ribbon', 'badge', 'flag'

    Returns:
        PIL Image (RGBA) with badge/banner
    """
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    width, height = size

    if style == 'ribbon':
        # Draw ribbon shape
        ribbon_points = [
            (int(width * 0.1), int(height * 0.3)),
            (int(width * 0.9), int(height * 0.3)),
            (int(width * 0.85), height // 2),
            (int(width * 0.9), int(height * 0.7)),
            (int(width * 0.1), int(height * 0.7)),
            (int(width * 0.15), height // 2)
        ]
        draw.polygon(ribbon_points, fill=color)

        # Add text
        font_size = int(height * 0.4)
        font = get_font(font_size, bold=True)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (width - text_width) // 2
        text_y = int(height * 0.25)

        # White text with black outline
        for adj_x in range(-3, 4):
            for adj_y in range(-3, 4):
                if adj_x != 0 or adj_y != 0:
                    draw.text((text_x + adj_x, text_y + adj_y), text, font=font, fill=(0, 0, 0))
        draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255))

    elif style == 'badge':
        # Circular badge
        center_x, center_y = width // 2, height // 2
        radius = min(width, height) // 2 - 10
        draw.ellipse([
            (center_x - radius, center_y - radius),
            (center_x + radius, center_y + radius)
        ], fill=color, outline=(255, 255, 255), width=8)

        # Add text
        font_size = int(radius * 0.6)
        font = get_font(font_size, bold=True)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = center_x - text_width // 2
        text_y = center_y - text_height // 2
        draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255))

    return img

def add_decorative_elements(img, positioning, brand_kit_options=None, element_types=['arrow', 'circle']):
    """
    Intelligently add decorative elements to thumbnail based on text position and brand colors

    Args:
        img: PIL Image to add elements to
        positioning: Dict with text position info
        brand_kit_options: Brand kit with colors
        element_types: List of element types to potentially add ['arrow', 'circle', 'starburst']

    Returns:
        PIL Image with decorative elements added
    """
    width, height = img.size
    img_rgba = img.convert('RGBA')

    # Get brand accent color
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        accent_color = brand_kit_options['gradient_colors'][0]
    else:
        accent_color = (255, 100, 50)  # Default vibrant orange

    print_log(f"🎨 Adding decorative elements: {element_types}")

    # Determine safe zones based on text position
    text_zone = positioning['zone'] if positioning else 'bottom'
    text_x, text_y = positioning['position'] if positioning else (width // 2, height // 2)

    # Add arrow pointing to text (if text is not centered)
    if 'arrow' in element_types and text_x < width * 0.4:
        # Text on left, add arrow on right
        arrow = create_curved_arrow(size=(int(width * 0.15), int(height * 0.15)),
                                    color=accent_color,
                                    direction='left',
                                    thickness=20,
                                    glow=True)

        arrow_x = int(width * 0.75)
        arrow_y = int(height * 0.5) if text_zone == 'middle' else int(height * 0.3)
        img_rgba.paste(arrow, (arrow_x, arrow_y), arrow)

    elif 'arrow' in element_types and text_x > width * 0.6:
        # Text on right, add arrow on left
        arrow = create_curved_arrow(size=(int(width * 0.15), int(height * 0.15)),
                                    color=accent_color,
                                    direction='right',
                                    thickness=20,
                                    glow=True)

        arrow_x = int(width * 0.1)
        arrow_y = int(height * 0.5) if text_zone == 'middle' else int(height * 0.3)
        img_rgba.paste(arrow, (arrow_x, arrow_y), arrow)

    # Add circle highlight in opposite corner from text
    if 'circle' in element_types:
        circle_size = int(min(width, height) * 0.2)

        if text_zone == 'top':
            # Text at top, add circle at bottom
            circle_x = int(width * 0.8)
            circle_y = int(height * 0.8)
        elif text_zone == 'bottom':
            # Text at bottom, add circle at top
            circle_x = int(width * 0.15)
            circle_y = int(height * 0.15)
        else:
            # Text in middle, add circle in corner
            circle_x = int(width * 0.85)
            circle_y = int(height * 0.15)

        circle = create_circle_highlight(size=(circle_size, circle_size),
                                        color=accent_color,
                                        thickness=15,
                                        style='dashed')

        img_rgba.paste(circle, (circle_x, circle_y), circle)

    # Add starburst for extra pop
    if 'starburst' in element_types:
        starburst_size = int(min(width, height) * 0.15)

        # Position starburst near text but not overlapping
        if text_zone == 'bottom':
            star_x = int(width * 0.85)
            star_y = int(height * 0.1)
        else:
            star_x = int(width * 0.85)
            star_y = int(height * 0.85)

        starburst = create_explosion_starburst(size=(starburst_size, starburst_size),
                                              color=accent_color,
                                              num_points=12)

        img_rgba.paste(starburst, (star_x, star_y), starburst)

    print_log("✓ Decorative elements added")
    return img_rgba.convert('RGB')

def draw_text_with_outline(draw, text, position, font, fill_color, outline_color, outline_width=4):
    """Draw text with professional outline and shadow"""
    x, y = position

    # Draw shadow first (offset down-right)
    shadow_color = (0, 0, 0, 180)
    for shadow_x in range(3):
        for shadow_y in range(3):
            draw.text((x + shadow_x + 2, y + shadow_y + 2), text, font=font, fill=shadow_color)

    # Draw thick outline
    for adj_x in range(-outline_width, outline_width + 1):
        for adj_y in range(-outline_width, outline_width + 1):
            if adj_x != 0 or adj_y != 0:
                draw.text((x + adj_x, y + adj_y), text, font=font, fill=outline_color)

    # Draw main text
    draw.text(position, text, font=font, fill=fill_color)

def draw_text_with_neon_glow(img, text, position, font, glow_color, glow_intensity=5):
    """
    Draw text with neon glow effect using multiple blur passes

    Args:
        img: PIL Image to draw on
        text: Text to render
        position: (x, y) tuple for text position
        font: PIL Font object
        glow_color: RGB color tuple for the glow
        glow_intensity: Number of blur passes (higher = stronger glow)
    """
    from PIL import ImageFilter

    x, y = position
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Create a larger canvas for the glow effect
    glow_padding = glow_intensity * 15
    glow_canvas = Image.new('RGBA', (text_width + glow_padding * 2, text_height + glow_padding * 2), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_canvas)

    # Draw text in glow color at center of canvas
    glow_draw.text((glow_padding - bbox[0], glow_padding - bbox[1]), text, font=font, fill=glow_color + (255,))

    # Apply multiple blur passes for strong neon glow
    for i in range(glow_intensity):
        glow_canvas = glow_canvas.filter(ImageFilter.GaussianBlur(radius=3 + i))

    # Paste glow onto main image
    glow_x = x - glow_padding + bbox[0]
    glow_y = y - glow_padding + bbox[1]
    img.paste(glow_canvas, (glow_x, glow_y), glow_canvas)

    # Draw the bright core text on top
    draw = ImageDraw.Draw(img)

    # Bright white core for maximum neon effect
    core_color = tuple(min(255, c + 100) for c in glow_color)
    draw.text(position, text, font=font, fill=core_color)

def draw_text_with_multi_stroke_outline(img, text, position, font, gradient_colors, outline_strokes=None, direction='vertical', enable_3d=False, shadow_layers=None):
    """
    Draw text with professional multi-stroke outlines and gradient fill (MrBeast-tier quality)

    Args:
        img: PIL Image to draw on
        text: Text to render
        position: (x, y) tuple for text position
        font: PIL Font object
        gradient_colors: List of RGB color tuples for gradient fill
        outline_strokes: List of dicts with 'width' and 'color' for each outline layer (innermost to outermost)
                        Example: [{'width': 8, 'color': '#000000'}, {'width': 12, 'color': '#FFFFFF'}, {'width': 18, 'color': '#000000'}]
                        If None, uses default professional multi-stroke (black-white-black)
        direction: 'vertical', 'horizontal', or 'diagonal' for gradient
        enable_3d: Enable 3D perspective shadow effect
        shadow_layers: Custom shadow layer specifications, or None for defaults
    """
    x, y = position
    draw = ImageDraw.Draw(img)

    # Default professional multi-stroke outline (3-layer: black inner, white middle, black outer)
    if outline_strokes is None:
        outline_strokes = [
            {'width': 18, 'color': (0, 0, 0)},      # Outer black stroke (18px)
            {'width': 14, 'color': (255, 255, 255)}, # Middle white stroke (14px)
            {'width': 8, 'color': (0, 0, 0)}         # Inner black stroke (8px)
        ]

    # Default professional shadow layers for 3D depth
    if shadow_layers is None and enable_3d:
        shadow_layers = [
            {'offset': (10, 10), 'color': (0, 0, 0), 'alpha': 200},
            {'offset': (8, 8), 'color': (0, 0, 0), 'alpha': 160},
            {'offset': (6, 6), 'color': (0, 0, 0), 'alpha': 120},
            {'offset': (4, 4), 'color': (0, 0, 0), 'alpha': 80},
            {'offset': (2, 2), 'color': (0, 0, 0), 'alpha': 40}
        ]

    # Draw 3D shadow layers (from furthest to closest)
    if enable_3d and shadow_layers:
        for shadow in reversed(shadow_layers):
            offset_x, offset_y = shadow['offset']
            shadow_color = shadow['color'] + (shadow['alpha'],)
            # Draw with slight blur for each shadow layer
            for dx in range(-1, 2):
                for dy in range(-1, 2):
                    draw.text((x + offset_x + dx, y + offset_y + dy), text, font=font, fill=shadow_color)
    elif not enable_3d:
        # Standard simple shadow
        shadow_color = (0, 0, 0, 180)
        for dx in range(3):
            for dy in range(3):
                draw.text((x + dx + 3, y + dy + 3), text, font=font, fill=shadow_color)

    # Draw multi-stroke outlines (from outermost to innermost for proper layering)
    for stroke in reversed(outline_strokes):
        width = stroke['width']
        color = stroke['color']

        # Convert hex color to RGB if needed
        if isinstance(color, str):
            if color.startswith('#'):
                color = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))

        # Draw outline stroke with this width
        for adj_x in range(-width, width + 1):
            for adj_y in range(-width, width + 1):
                # Create circular outline (not square)
                distance = (adj_x**2 + adj_y**2)**0.5
                if distance <= width and distance > 0:
                    draw.text((x + adj_x, y + adj_y), text, font=font, fill=color)

    # Create and paste gradient text on top
    gradient_text = create_text_gradient(text, font, gradient_colors, direction)
    bbox = font.getbbox(text)
    img.paste(gradient_text, (x + bbox[0], y + bbox[1]), gradient_text)

def draw_text_with_gradient(img, text, position, font, gradient_colors, outline_color, outline_width=4, direction='vertical', enable_3d=False, enable_neon=False):
    """
    Draw text with gradient fill, outline, and shadow (legacy function - kept for compatibility)

    NOTE: For professional MrBeast-tier thumbnails, use draw_text_with_multi_stroke_outline() instead

    Args:
        img: PIL Image to draw on
        text: Text to render
        position: (x, y) tuple for text position
        font: PIL Font object
        gradient_colors: List of RGB color tuples for gradient
        outline_color: RGB color for outline
        outline_width: Width of outline in pixels
        direction: 'vertical', 'horizontal', or 'diagonal'
        enable_3d: Enable 3D perspective shadow effect
        enable_neon: Enable neon glow effect
    """
    x, y = position
    draw = ImageDraw.Draw(img)

    if enable_3d:
        # 3D Effect: Draw multiple shadow layers for depth
        # Create perspective shadow going down-right with diminishing alpha
        shadow_layers = 12  # Number of shadow layers for depth
        for i in range(shadow_layers, 0, -1):
            # Calculate shadow offset (perspective: further layers = more offset)
            offset_x = i * 2
            offset_y = i * 2
            # Alpha decreases with distance
            alpha = int(150 - (i * 8))
            shadow_color = (0, 0, 0, max(0, alpha))

            # Draw shadow layer
            for shadow_x in range(2):
                for shadow_y in range(2):
                    draw.text((x + offset_x + shadow_x, y + offset_y + shadow_y), text, font=font, fill=shadow_color)
    else:
        # Standard shadow (offset down-right)
        shadow_color = (0, 0, 0, 180)
        for shadow_x in range(3):
            for shadow_y in range(3):
                draw.text((x + shadow_x + 2, y + shadow_y + 2), text, font=font, fill=shadow_color)

    # Optional: Add neon glow effect before drawing text
    if enable_neon:
        # Use the first gradient color for glow
        glow_color = gradient_colors[0] if gradient_colors else (255, 0, 255)
        draw_text_with_neon_glow(img, text, (x, y), font, glow_color, glow_intensity=4)
        # Skip outline for neon effect (glow replaces it)
    else:
        # Draw thick outline (non-neon mode)
        for adj_x in range(-outline_width, outline_width + 1):
            for adj_y in range(-outline_width, outline_width + 1):
                if adj_x != 0 or adj_y != 0:
                    draw.text((x + adj_x, y + adj_y), text, font=font, fill=outline_color)

    # Create and paste gradient text
    gradient_text = create_text_gradient(text, font, gradient_colors, direction)
    bbox = font.getbbox(text)
    img.paste(gradient_text, (x + bbox[0], y + bbox[1]), gradient_text)

def apply_mrbeast_style(img, draw, text, positioning=None, brand_kit_options=None, use_container=True):
    """MrBeast style: MASSIVE bold text with gradient fill and ultra thick multi-stroke outline - YouTube viral style

    Args:
        use_container: If True, uses professional white containers. If False, uses gradient text style.
    """
    # Use professional container style by default for better readability
    if use_container:
        print_log("📦 Using container mode for MrBeast style")
        return apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Legacy gradient style (for users who prefer the old look)
    width, height = img.size
    print_log("🎨 Using legacy gradient mode for MrBeast style")

    # HUGE font - MrBeast goes big!
    base_font_size = int(height * 0.18)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])
    font = get_font(base_font_size, bold=True)

    # Handle multi-line text
    max_width = int(width * 0.9)
    lines = wrap_text_smart(text, font, max_width, draw)

    # Calculate total text block height
    line_height = int(base_font_size * 1.2)
    total_height = line_height * len(lines)

    # Position: use smart positioning or default centered
    if positioning:
        start_x, start_y = positioning['position']
        start_y = start_y - total_height // 2  # Center the text block vertically
    else:
        start_x = width // 2
        start_y = (height - total_height) // 2

    # Professional gradient: use brand kit colors or default MrBeast gold-orange
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        gradient_colors = brand_kit_options['gradient_colors']
        print_log(f"🎨 Using brand kit gradient: {gradient_colors}")
    else:
        gradient_colors = [
            (255, 223, 0),    # Bright gold
            (255, 200, 0),    # Rich gold
            (255, 165, 0)     # Orange accent
        ]

    # Professional multi-stroke outline: use brand kit or default black-white-black
    if brand_kit_options and brand_kit_options.get('outline_width'):
        outline_width = brand_kit_options['outline_width']
        outline_color_str = brand_kit_options.get('outline_color', '#000000')
        # Parse hex to RGB
        if outline_color_str.startswith('#'):
            outline_color = hex_to_rgb(outline_color_str)
        else:
            outline_color = (0, 0, 0)

        outline_strokes = [
            {'width': outline_width + 12, 'color': outline_color},      # Outer stroke
            {'width': outline_width + 7, 'color': (255, 255, 255)},     # Middle white
            {'width': outline_width, 'color': outline_color}             # Inner stroke
        ]
        print_log(f"🎨 Using brand kit outline: width={outline_width}, color={outline_color}")
    else:
        # SIMPLIFIED: Reduced outline widths from 20/15/8 to 10/7/4 for cleaner look
        outline_strokes = [
            {'width': 10, 'color': (0, 0, 0)},        # Outer black stroke (10px, was 20px)
            {'width': 7, 'color': (255, 255, 255)},   # Middle white stroke (7px, was 15px)
            {'width': 4, 'color': (0, 0, 0)}          # Inner black stroke (4px, was 8px)
        ]

    # Draw each line with professional multi-stroke outline
    current_y = start_y
    enable_3d = brand_kit_options.get('enable_3d', True) if brand_kit_options else True
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = start_x - text_width // 2  # Center horizontally

        # Draw text with PROFESSIONAL multi-stroke outline, gradient fill, and optional 3D effect
        draw_text_with_multi_stroke_outline(img, line, (x, current_y), font, gradient_colors,
                                           outline_strokes=outline_strokes, direction='vertical', enable_3d=enable_3d)
        current_y += line_height

    # Add subtle red accent bars top and bottom for extra pop (unless brand kit disables it)
    if not brand_kit_options or brand_kit_options.get('show_accent_bars', True):
        bar_height = int(height * 0.08)
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([(0, 0), (width, bar_height)], fill=(255, 0, 0, 120))
        overlay_draw.rectangle([(0, height - bar_height), (width, height)], fill=(255, 0, 0, 120))
        img.paste(overlay, (0, 0), overlay)

def apply_tech_style(img, draw, text, positioning=None, brand_kit_options=None, use_container=True):
    """Tech Review style: Modern gradient bar with clean typography

    Args:
        use_container: If True, uses professional white containers. If False, uses gradient bar style.
    """
    # Use professional container style by default
    if use_container:
        print_log("📦 Using container mode for Tech style")
        return apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Legacy gradient bar style
    width, height = img.size
    print_log("🎨 Using legacy gradient bar mode for Tech style")

    # Add gradient bar at bottom (blue to purple gradient)
    bar_height = int(height * 0.28)
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Create gradient
    for y_pos in range(height - bar_height, height):
        ratio = (y_pos - (height - bar_height)) / bar_height
        alpha = int(200 + (ratio * 55))  # Fade in gradient
        r = int(20 + ratio * 20)
        g = int(20 + ratio * 20)
        b = int(40 + ratio * 60)
        overlay_draw.line([(0, y_pos), (width, y_pos)], fill=(r, g, b, alpha))

    img.paste(overlay, (0, 0), overlay)

    # Re-create draw context
    draw = ImageDraw.Draw(img)

    # Large professional font
    base_font_size = int(height * 0.11)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])
    font = get_font(base_font_size, bold=True)

    # Handle multi-line text
    max_width = int(width * 0.85)
    lines = wrap_text_smart(text, font, max_width, draw)

    # Calculate total text block height
    line_height = int(base_font_size * 1.15)
    total_height = line_height * len(lines)

    # Position: use smart positioning or default to bottom bar
    if positioning and positioning['zone'] != 'bottom':
        # If smart positioning suggests top/middle, use it
        start_x, start_y = positioning['position']
        start_y = start_y - total_height // 2
    else:
        # Default: centered in bottom bar
        start_x = width // 2
        start_y = height - bar_height // 2 - total_height // 2

    # Tech gradient: use brand kit colors or default Blue to Cyan
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        tech_gradient = brand_kit_options['gradient_colors']
        print_log(f"🎨 Using brand kit gradient: {tech_gradient}")
    else:
        tech_gradient = [
            (100, 200, 255),  # Light blue
            (50, 150, 255),   # Medium blue
            (0, 200, 255)     # Cyan accent
        ]

    # Draw each line with gradient
    current_y = start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = start_x - text_width // 2

        # Modern gradient blue text with subtle outline
        draw_text_with_gradient(img, line, (x, current_y), font, tech_gradient, '#000000', outline_width=3, direction='horizontal')
        current_y += line_height

def apply_vlog_style(img, draw, text, positioning=None, brand_kit_options=None, use_container=True):
    """Vlog style: Colorful, casual, flexible positioning

    Args:
        use_container: If True, uses professional white containers. If False, uses colorful gradient style.
    """
    # Use professional container style by default
    if use_container:
        print_log("📦 Using container mode for Vlog style")
        return apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Legacy colorful gradient style
    width, height = img.size
    print_log("🎨 Using legacy colorful gradient mode for Vlog style")

    # Medium casual font
    base_font_size = int(height * 0.10)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])
    font = get_font(base_font_size, bold=True)

    # Handle multi-line text
    max_width = int(width * 0.9)
    lines = wrap_text_smart(text, font, max_width, draw)

    # Calculate total text block height
    line_height = int(base_font_size * 1.15)
    total_height = line_height * len(lines)

    # Position: use smart positioning or default to top-left
    if positioning:
        start_x, start_y = positioning['position']
        # For vlog, left-align if in top zone, center otherwise
        if positioning['zone'] == 'top':
            start_x = int(width * 0.05)
        start_y = start_y - total_height // 2
    else:
        start_x = int(width * 0.05)
        start_y = int(height * 0.05)

    # Vlog gradient: use brand kit colors or default Pink to Purple to Yellow (vibrant, fun)
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        vlog_gradient = brand_kit_options['gradient_colors']
        print_log(f"🎨 Using brand kit gradient: {vlog_gradient}")
    else:
        vlog_gradient = [
            (255, 20, 147),   # Deep pink
            (218, 112, 214),  # Plum purple
            (255, 215, 0)     # Gold yellow
        ]

    # Draw each line with fun gradient
    current_y = start_y
    for line in lines:
        # Colorful vlog gradient text with white outline
        draw_text_with_gradient(img, line, (start_x, current_y), font, vlog_gradient, '#FFFFFF', outline_width=4, direction='diagonal')
        current_y += line_height

def apply_tutorial_style(img, draw, text, positioning=None, brand_kit_options=None, use_container=True):
    """Tutorial style: Step numbers, clear text with smart positioning

    Args:
        use_container: If True, uses professional white containers. If False, uses simple outline style.
    """
    # Use professional container style by default
    if use_container:
        print_log("📦 Using container mode for Tutorial style")
        return apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Legacy simple outline style
    width, height = img.size
    print_log("🎨 Using legacy outline mode for Tutorial style")

    # Medium clear font
    base_font_size = int(height * 0.09)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])
    font = get_font(base_font_size, bold=True)

    # Handle multi-line text
    max_width = int(width * 0.85)
    lines = wrap_text_smart(text, font, max_width, draw)

    # Calculate total text block height
    line_height = int(base_font_size * 1.15)
    total_height = line_height * len(lines)

    # Position: use smart positioning or default centered
    if positioning:
        start_x, start_y = positioning['position']
        start_y = start_y - total_height // 2
    else:
        start_x = width // 2
        start_y = int(height * 0.4)

    # Tutorial text: use brand kit colors or default blue
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        # Use first gradient color for text fill
        brand_colors = brand_kit_options['gradient_colors']
        text_color = f'#{brand_colors[0][0]:02x}{brand_colors[0][1]:02x}{brand_colors[0][2]:02x}'
        print_log(f"🎨 Using brand kit text color: {text_color}")
    else:
        text_color = '#0066FF'  # Default blue

    # Draw each line
    current_y = start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = start_x - text_width // 2

        # Text with white outline
        draw_text_with_outline(draw, line, (x, current_y), font, text_color, '#FFFFFF', outline_width=4)
        current_y += line_height

    # Add circle badge in top left (avoid if text is in top zone)
    if not positioning or positioning['zone'] != 'top':
        circle_size = int(height * 0.12)
        circle_x = int(width * 0.08)
        circle_y = int(height * 0.08)
        draw.ellipse(
            [(circle_x - circle_size // 2, circle_y - circle_size // 2),
             (circle_x + circle_size // 2, circle_y + circle_size // 2)],
            fill='#0066FF',
            outline='#FFFFFF',
            width=5
        )

def apply_dramatic_style(img, draw, text, positioning=None, brand_kit_options=None, use_container=True):
    """Dramatic style: Maximum impact with vignette, huge text, and professional multi-stroke outlines

    Args:
        use_container: If True, uses professional white containers. If False, uses dramatic gradient style.
    """
    # Use professional container style by default
    if use_container:
        print_log("📦 Using container mode for Dramatic style")
        return apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Legacy dramatic gradient style
    width, height = img.size
    print_log("🎨 Using legacy dramatic gradient mode for Dramatic style")

    # Apply vignette effect (darken edges, brighten center)
    vignette = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    vignette_draw = ImageDraw.Draw(vignette)

    center_x, center_y = width // 2, height // 2
    max_dist = ((width ** 2 + height ** 2) ** 0.5) / 2

    for y_pos in range(0, height, 10):
        for x_pos in range(0, width, 10):
            dist = ((x_pos - center_x) ** 2 + (y_pos - center_y) ** 2) ** 0.5
            alpha = int((dist / max_dist) * 150)
            vignette_draw.rectangle([(x_pos, y_pos), (x_pos + 10, y_pos + 10)], fill=(0, 0, 0, alpha))

    img.paste(vignette, (0, 0), vignette)

    # Re-create draw context
    draw = ImageDraw.Draw(img)

    # MASSIVE dramatic font
    base_font_size = int(height * 0.16)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])
    font = get_font(base_font_size, bold=True)

    # Handle multi-line text
    max_width = int(width * 0.9)
    lines = wrap_text_smart(text, font, max_width, draw)

    # Calculate total text block height
    line_height = int(base_font_size * 1.2)
    total_height = line_height * len(lines)

    # Position: use smart positioning or default centered
    if positioning:
        start_x, start_y = positioning['position']
        start_y = start_y - total_height // 2
    else:
        start_x = width // 2
        start_y = (height - total_height) // 2

    # Dramatic gradient: use brand kit colors or default White to light blue
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        dramatic_gradient = brand_kit_options['gradient_colors']
        print_log(f"🎨 Using brand kit gradient: {dramatic_gradient}")
    else:
        dramatic_gradient = [
            (255, 255, 255),  # Pure white
            (240, 240, 255),  # Slight blue tint
            (200, 220, 255)   # Light blue
        ]

    # SIMPLIFIED: Reduced outline widths from 18/13/7 to 10/7/4 for cleaner look
    outline_strokes = [
        {'width': 10, 'color': (0, 0, 0)},        # Outer black stroke (10px, was 18px)
        {'width': 7, 'color': (255, 255, 255)},   # Middle white stroke (7px, was 13px)
        {'width': 4, 'color': (0, 0, 0)}          # Inner black stroke (4px, was 7px)
    ]

    # Draw each line with professional multi-stroke outline for maximum impact
    current_y = start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = start_x - text_width // 2

        # Dramatic gradient white text with PROFESSIONAL multi-stroke outline and 3D depth
        draw_text_with_multi_stroke_outline(img, line, (x, current_y), font, dramatic_gradient,
                                           outline_strokes=outline_strokes, direction='vertical', enable_3d=True)
        current_y += line_height

def apply_diagonal_style(img, draw, text, positioning=None, brand_kit_options=None, use_container=True):
    """
    Diagonal text layout: Modern dynamic composition with rotated text and decorative elements

    Args:
        use_container: If True, uses professional white containers. If False, uses rotated gradient style.
    """
    # Use professional container style by default
    if use_container:
        print_log("📦 Using container mode for Diagonal style")
        return apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Legacy diagonal rotation style
    width, height = img.size
    print_log("🎨 Using legacy diagonal rotation mode")

    # Large bold font
    base_font_size = int(height * 0.14)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])
    font = get_font(base_font_size, bold=True)

    # Use brand colors or default
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        text_gradient = brand_kit_options['gradient_colors']
        print_log(f"🎨 Using brand kit gradient: {text_gradient}")
    else:
        text_gradient = [
            (255, 100, 100),  # Red
            (255, 200, 50),   # Orange
            (255, 255, 100)   # Yellow
        ]

    # Create rotated text image
    # Measure text size
    temp_img = Image.new('RGBA', (width * 2, height * 2), (0, 0, 0, 0))
    temp_draw = ImageDraw.Draw(temp_img)
    bbox = temp_draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Create text on transparent canvas
    text_canvas = Image.new('RGBA', (text_width + 200, text_height + 200), (0, 0, 0, 0))

    # SIMPLIFIED: Reduced outline widths from 16/11/6 to 10/7/4 for cleaner look
    outline_strokes = [
        {'width': 10, 'color': (0, 0, 0)},        # Outer (10px, was 16px)
        {'width': 7, 'color': (255, 255, 255)},   # Middle (7px, was 11px)
        {'width': 4, 'color': (0, 0, 0)}          # Inner (4px, was 6px)
    ]

    draw_text_with_multi_stroke_outline(
        text_canvas, text, (100, 100), font, text_gradient,
        outline_strokes=outline_strokes, direction='horizontal', enable_3d=True
    )

    # Rotate text -15 degrees for dynamic diagonal effect
    rotated_text = text_canvas.rotate(15, expand=True, resample=Image.Resampling.BICUBIC)

    # Position rotated text
    if positioning and positioning['zone'] == 'top':
        paste_x = int(width * 0.1)
        paste_y = int(height * 0.05)
    elif positioning and positioning['zone'] == 'bottom':
        paste_x = int(width * 0.1)
        paste_y = int(height * 0.6)
    else:
        paste_x = int(width * 0.1)
        paste_y = int(height * 0.35)

    # Composite rotated text
    img_rgba = img.convert('RGBA')
    img_rgba.paste(rotated_text, (paste_x, paste_y), rotated_text)

    # Add decorative diagonal lines in brand colors
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    accent_color = text_gradient[0] if text_gradient else (255, 100, 100)

    # Draw diagonal accent lines
    for i in range(3):
        offset = i * 15
        overlay_draw.line(
            [(0 + offset, height), (width * 0.4 + offset, 0)],
            fill=(*accent_color, 80),
            width=8
        )

    img_rgba = Image.alpha_composite(img_rgba, overlay)

    # Update original image
    img.paste(img_rgba.convert('RGB'), (0, 0))

def apply_splitscreen_style(img, draw, text, positioning=None, brand_kit_options=None, use_container=True):
    """
    Split-screen layout: Half image, half color block with text overlay

    Args:
        use_container: If True, uses professional white containers. If False, uses split-screen colored block.
    """
    # Use professional container style by default
    if use_container:
        print_log("📦 Using container mode for Split-screen style")
        return apply_professional_style(img, draw, text, positioning, brand_kit_options)

    # Legacy split-screen colored block style
    width, height = img.size
    print_log("🎨 Using legacy split-screen block mode")

    # Create color block on right half using brand colors
    if brand_kit_options and brand_kit_options.get('gradient_colors'):
        brand_colors = brand_kit_options['gradient_colors']
        block_gradient = create_multi_gradient(width // 2, height, brand_colors, 'vertical')
    else:
        block_gradient = create_multi_gradient(width // 2, height, [
            (20, 100, 200),
            (100, 50, 200),
            (200, 50, 150)
        ], 'vertical')

    # Add noise texture for depth
    block_gradient = add_noise_texture(block_gradient, intensity=10)

    # Paste color block on right half
    img.paste(block_gradient, (width // 2, 0))

    # Add diagonal split line for visual interest
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Draw thick diagonal separator
    split_x = width // 2
    for offset in range(-10, 10):
        overlay_draw.line(
            [(split_x + offset, 0), (split_x + offset + 100, height)],
            fill=(255, 255, 255, 30),
            width=2
        )

    img_rgba = img.convert('RGBA')
    img_rgba = Image.alpha_composite(img_rgba, overlay)
    img.paste(img_rgba.convert('RGB'), (0, 0))

    # Re-create draw context
    draw = ImageDraw.Draw(img)

    # Large text on the color block side
    base_font_size = int(height * 0.12)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])
    font = get_font(base_font_size, bold=True)

    # Wrap text to fit in right half
    max_width = int(width * 0.4)
    lines = wrap_text_smart(text, font, max_width, draw)

    # Calculate total text block height
    line_height = int(base_font_size * 1.15)
    total_height = line_height * len(lines)

    # Position text on right half, centered
    start_x = int(width * 0.75)
    start_y = (height - total_height) // 2

    # SIMPLIFIED: Reduced outline widths from 14/9/5 to 10/7/4 for cleaner look
    outline_strokes = [
        {'width': 10, 'color': (0, 0, 0)},        # Outer (10px, was 14px)
        {'width': 7, 'color': (255, 255, 255)},   # Middle (7px, was 9px)
        {'width': 4, 'color': (0, 0, 0)}          # Inner (4px, was 5px)
    ]

    current_y = start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = start_x - text_width // 2

        # White gradient text
        white_gradient = [(255, 255, 255), (240, 240, 255), (220, 220, 255)]

        draw_text_with_multi_stroke_outline(
            img, line, (x, current_y), font, white_gradient,
            outline_strokes=outline_strokes, direction='vertical', enable_3d=True
        )
        current_y += line_height

def apply_professional_style(img, draw, text, positioning=None, brand_kit_options=None):
    """
    PROFESSIONAL STYLE: Industry-standard YouTube thumbnail style

    Uses white rounded rectangle containers with black text for maximum readability.
    This is the style used by MrBeast, MKBHD, and other top YouTubers.

    Key features:
    - Clean white rounded containers (speech bubble style)
    - Simple black text for readability
    - Drop shadows for depth
    - Rule of thirds positioning
    - Multiple containers for headline + subtitle
    """
    width, height = img.size
    print_log("🎯 Applying PROFESSIONAL style with white text containers")

    # Split text into headline and subtitle if it has multiple words
    words = text.split()

    # Determine container layout
    if len(words) <= 3:
        # Single container for short text
        containers = [{'text': text, 'size_multiplier': 1.0}]
    elif len(words) <= 6:
        # Two containers: split roughly in half
        mid = len(words) // 2
        headline = ' '.join(words[:mid])
        subtitle = ' '.join(words[mid:])
        containers = [
            {'text': headline, 'size_multiplier': 1.2},
            {'text': subtitle, 'size_multiplier': 0.9}
        ]
    else:
        # Three containers for long text
        third = len(words) // 3
        headline = ' '.join(words[:third])
        subtitle = ' '.join(words[third:third*2])
        cta = ' '.join(words[third*2:])
        containers = [
            {'text': headline, 'size_multiplier': 1.2},
            {'text': subtitle, 'size_multiplier': 0.9},
            {'text': cta, 'size_multiplier': 0.8}
        ]

    # Determine positioning based on face detection
    text_zone = positioning['zone'] if positioning else 'bottom'
    text_x, text_y = positioning['position'] if positioning else (width // 2, height // 2)

    # Calculate container positions using rule of thirds
    if text_x < width * 0.4:
        # Subject on left, containers on right
        container_x = int(width * 0.7)
        alignment = 'center'
    elif text_x > width * 0.6:
        # Subject on right, containers on left
        container_x = int(width * 0.3)
        alignment = 'center'
    else:
        # Subject centered, containers at bottom
        container_x = width // 2
        alignment = 'center'

    # Calculate starting Y position based on number of containers
    base_font_size = int(height * 0.08)
    if positioning:
        base_font_size = int(base_font_size * positioning['font_size_multiplier'])

    # Spacing between containers
    container_spacing = int(height * 0.03)

    # Estimate total height needed
    total_height = 0
    container_data = []

    for container_info in containers:
        font_size = int(base_font_size * container_info['size_multiplier'])
        font = get_font(font_size, bold=True)

        # Create container
        container_img, text_offset = create_text_container(
            width=int(width * 0.85),
            height=height,
            text=container_info['text'],
            font=font,
            padding=int(font_size * 0.6),
            corner_radius=int(font_size * 0.5),
            bg_color=(255, 255, 255, 245),  # Slightly transparent white
            shadow_offset=int(font_size * 0.15),
            shadow_blur=int(font_size * 0.3)
        )

        container_data.append({
            'img': container_img,
            'text_offset': text_offset,
            'height': container_img.size[1]
        })
        total_height += container_img.size[1] + container_spacing

    # Remove last spacing
    total_height -= container_spacing

    # Position containers vertically
    if text_zone == 'top':
        start_y = int(height * 0.1)
    elif text_zone == 'middle':
        start_y = (height - total_height) // 2
    else:  # bottom
        start_y = int(height * 0.7 - total_height // 2)

    # Composite containers onto image
    img_rgba = img.convert('RGBA')
    current_y = start_y

    for data in container_data:
        container_img = data['img']
        container_width, container_height = container_img.size

        # Center horizontally
        paste_x = container_x - container_width // 2
        paste_y = current_y

        # Ensure container stays within bounds
        paste_x = max(int(width * 0.05), min(paste_x, width - container_width - int(width * 0.05)))
        paste_y = max(int(height * 0.05), min(paste_y, height - container_height - int(height * 0.05)))

        # Composite container
        img_rgba.paste(container_img, (paste_x, paste_y), container_img)

        current_y += container_height + container_spacing

    # Update original image
    img.paste(img_rgba.convert('RGB'), (0, 0))

    print_log("✓ Professional white container style applied!")

def apply_brand_kit_logo_watermark(img, brand_kit_options):
    """
    Apply logo and watermark from brand kit to thumbnail

    Args:
        img: PIL Image to apply overlays to
        brand_kit_options: Dict with logo and watermark settings

    Returns:
        PIL Image with overlays applied
    """
    width, height = img.size

    # Apply logo
    logo_info = brand_kit_options.get('logo')
    if logo_info and logo_info.get('path') and os.path.exists(logo_info['path']):
        try:
            print_log(f"📸 Adding brand kit logo: {logo_info['path']}")
            logo = Image.open(logo_info['path']).convert('RGBA')

            # Resize logo based on size percentage
            logo_size_percent = logo_info.get('size', 10) / 100.0
            logo_width = int(width * logo_size_percent)
            logo_aspect = logo.height / logo.width
            logo_height = int(logo_width * logo_aspect)
            logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

            # Apply opacity
            opacity = logo_info.get('opacity', 100) / 100.0
            if opacity < 1.0:
                logo_array = np.array(logo)
                logo_array[:, :, 3] = (logo_array[:, :, 3] * opacity).astype(np.uint8)
                logo = Image.fromarray(logo_array, 'RGBA')

            # Position logo
            position = logo_info.get('position', 'bottom-right')
            if position == 'bottom-right':
                x = width - logo_width - 20
                y = height - logo_height - 20
            elif position == 'bottom-left':
                x = 20
                y = height - logo_height - 20
            elif position == 'top-right':
                x = width - logo_width - 20
                y = 20
            elif position == 'top-left':
                x = 20
                y = 20
            else:  # center
                x = (width - logo_width) // 2
                y = (height - logo_height) // 2

            # Composite logo
            img_rgba = img.convert('RGBA')
            img_rgba.paste(logo, (x, y), logo)
            img = img_rgba.convert('RGB')
            print_log("✓ Logo applied")
        except Exception as e:
            print_log(f"⚠ Failed to apply logo: {e}")

    # Apply watermark (similar to logo but typically smaller and more subtle)
    watermark_info = brand_kit_options.get('watermark')
    if watermark_info and watermark_info.get('path') and os.path.exists(watermark_info['path']):
        try:
            print_log(f"🏷️ Adding brand kit watermark: {watermark_info['path']}")
            watermark = Image.open(watermark_info['path']).convert('RGBA')

            # Resize watermark
            wm_size_percent = watermark_info.get('size', 5) / 100.0
            wm_width = int(width * wm_size_percent)
            wm_aspect = watermark.height / watermark.width
            wm_height = int(wm_width * wm_aspect)
            watermark = watermark.resize((wm_width, wm_height), Image.Resampling.LANCZOS)

            # Apply opacity
            opacity = watermark_info.get('opacity', 50) / 100.0
            if opacity < 1.0:
                wm_array = np.array(watermark)
                wm_array[:, :, 3] = (wm_array[:, :, 3] * opacity).astype(np.uint8)
                watermark = Image.fromarray(wm_array, 'RGBA')

            # Position watermark
            position = watermark_info.get('position', 'bottom-right')
            if position == 'bottom-right':
                x = width - wm_width - 10
                y = height - wm_height - 10
            elif position == 'bottom-left':
                x = 10
                y = height - wm_height - 10
            elif position == 'top-right':
                x = width - wm_width - 10
                y = 10
            elif position == 'top-left':
                x = 10
                y = 10
            else:
                x = (width - wm_width) // 2
                y = (height - wm_height) // 2

            # Composite watermark
            img_rgba = img.convert('RGBA')
            img_rgba.paste(watermark, (x, y), watermark)
            img = img_rgba.convert('RGB')
            print_log("✓ Watermark applied")
        except Exception as e:
            print_log(f"⚠ Failed to apply watermark: {e}")

    return img

def main():
    parser = argparse.ArgumentParser(description='AI Thumbnail Generator')
    parser.add_argument('--mode', required=True, choices=['analyze', 'extract', 'generate'],
                       help='Operation mode: analyze frames, extract single frame, or generate with text')
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--output', required=True, help='Output path for result')
    parser.add_argument('--timestamp', type=float, help='Timestamp in seconds (for extract/generate modes)')
    parser.add_argument('--text', help='Text overlay (for generate mode)')
    parser.add_argument('--template', default='auto', help='Template style: auto, mrbeast, tech, vlog, tutorial, dramatic (auto picks best)')
    parser.add_argument('--background', default='auto', help='Background type: auto, original, gradient_blue, gradient_fire, gradient_ocean, gradient_sunset, blur, blur_dark (auto picks best)')
    parser.add_argument('--brandkit-id', help='Brand kit ID to apply custom colors/fonts/logo')
    parser.add_argument('--interval', type=float, default=2.0, help='Frame extraction interval in seconds')
    parser.add_argument('--max-frames', type=int, default=15, help='Maximum frames to analyze')

    args = parser.parse_args()

    try:
        if args.mode == 'analyze':
            # Analyze video and return candidate frames
            candidates = extract_and_analyze_frames(args.video, args.interval, args.max_frames)

            # Save results as JSON
            result = {
                'success': True,
                'candidates': candidates,
                'video_path': args.video
            }

            print(json.dumps(result))

        elif args.mode == 'extract':
            # Extract single frame at timestamp
            if args.timestamp is None:
                raise ValueError("--timestamp required for extract mode")

            output_path = extract_frame_at_timestamp(args.video, args.timestamp, args.output)

            result = {
                'success': True,
                'frame_path': output_path,
                'timestamp': args.timestamp
            }

            print(json.dumps(result))

        elif args.mode == 'generate':
            # Generate thumbnail with text overlay
            if args.timestamp is None:
                raise ValueError("--timestamp required for generate mode")
            if args.text is None:
                raise ValueError("--text required for generate mode")

            # Load brand kit if provided
            brand_kit_options = None
            if args.brandkit_id and BRANDKIT_AVAILABLE:
                print_log(f"🎨 Loading brand kit: {args.brandkit_id}")
                brand_kit_manager = BrandKitManager()
                brand_kit = brand_kit_manager.load_brand_kit(args.brandkit_id)
                if brand_kit:
                    # Convert brand kit to thumbnail options
                    brand_kit_options = brand_kit_manager.apply_brand_kit_to_options(brand_kit, args.template)
                    print_log(f"✓ Brand kit loaded: {brand_kit.get('name', 'Unnamed')}")
                    print_log(f"  Colors: {brand_kit_options.get('gradient_colors')}")
                    print_log(f"  Outline: {brand_kit_options.get('outline_color')}")
                else:
                    print_log(f"⚠ Brand kit not found: {args.brandkit_id}")

            # First extract frame to temp location
            temp_frame = args.output.replace('.png', '_temp.png')
            extract_frame_at_timestamp(args.video, args.timestamp, temp_frame)

            # Auto-select template and background if requested
            template = args.template
            background = args.background

            if template == 'auto' or background == 'auto':
                auto_template, auto_background = auto_select_template_and_background(temp_frame)
                if template == 'auto':
                    template = auto_template
                if background == 'auto':
                    background = auto_background

            # Apply text overlay with background option
            thumbnail_path = add_text_overlay(temp_frame, args.text, template, args.output, background, brand_kit_options)

            # Apply brand kit logo and watermark if present
            if brand_kit_options and (brand_kit_options.get('logo') or brand_kit_options.get('watermark')):
                print_log("🎨 Applying brand kit logo/watermark...")
                final_img = Image.open(thumbnail_path)
                final_img = apply_brand_kit_logo_watermark(final_img, brand_kit_options)
                final_img.save(thumbnail_path, 'PNG', quality=95)
                print_log("✓ Brand kit overlays applied")

            # Clean up temp file
            if os.path.exists(temp_frame):
                os.remove(temp_frame)

            result = {
                'success': True,
                'thumbnail_path': thumbnail_path,
                'timestamp': args.timestamp,
                'text': args.text,
                'template': template,
                'brandkit_applied': brand_kit_options is not None
            }

            print(json.dumps(result))

        sys.exit(0)

    except Exception as e:
        print_log(f"Error: {str(e)}")
        result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == '__main__':
    main()
