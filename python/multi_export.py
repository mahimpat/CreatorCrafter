"""
Multi-Platform Thumbnail Export System
Handles smart resizing, cropping, and format conversion for various platforms
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw
import os
import json
import argparse
from pathlib import Path


def print_log(message):
    """Print log message to stderr"""
    import sys
    print(message, file=sys.stderr)


def detect_faces_for_crop(image_path):
    """
    Detect faces in image for smart cropping
    Returns center of mass of all faces
    """
    try:
        import cv2

        # Load face cascade
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)

        # Read image
        img = cv2.imread(image_path)
        if img is None:
            return None

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        if len(faces) == 0:
            return None

        # Calculate center of mass of all faces
        total_x = 0
        total_y = 0
        total_area = 0

        for (x, y, w, h) in faces:
            face_center_x = x + w // 2
            face_center_y = y + h // 2
            face_area = w * h

            total_x += face_center_x * face_area
            total_y += face_center_y * face_area
            total_area += face_area

        if total_area == 0:
            return None

        # Weighted center
        center_x = total_x // total_area
        center_y = total_y // total_area

        # Return as ratio of image dimensions
        height, width = img.shape[:2]
        return (center_x / width, center_y / height)

    except Exception as e:
        print_log(f"Face detection failed: {e}")
        return None


def smart_crop(image, target_width, target_height, face_center=None):
    """
    Smart crop with face detection awareness

    Args:
        image: PIL Image
        target_width: Target width
        target_height: Target height
        face_center: (x_ratio, y_ratio) center of faces, or None for center crop

    Returns:
        Cropped PIL Image
    """
    orig_width, orig_height = image.size
    orig_aspect = orig_width / orig_height
    target_aspect = target_width / target_height

    # Calculate crop dimensions
    if orig_aspect > target_aspect:
        # Image is wider - crop width
        new_height = orig_height
        new_width = int(orig_height * target_aspect)
    else:
        # Image is taller - crop height
        new_width = orig_width
        new_height = int(orig_width / target_aspect)

    # Calculate crop position
    if face_center:
        # Center crop around faces
        center_x = int(orig_width * face_center[0])
        center_y = int(orig_height * face_center[1])

        # Ensure crop stays within bounds
        left = max(0, min(center_x - new_width // 2, orig_width - new_width))
        top = max(0, min(center_y - new_height // 2, orig_height - new_height))
    else:
        # Center crop
        left = (orig_width - new_width) // 2
        top = (orig_height - new_height) // 2

    right = left + new_width
    bottom = top + new_height

    # Crop
    cropped = image.crop((left, top, right, bottom))

    # Resize to target dimensions
    resized = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)

    return resized


def fit_contain(image, target_width, target_height, background_color=(0, 0, 0)):
    """
    Fit image within dimensions, maintaining aspect ratio with letterboxing

    Args:
        image: PIL Image
        target_width: Target width
        target_height: Target height
        background_color: RGB tuple for letterbox bars

    Returns:
        PIL Image with letterboxing
    """
    orig_width, orig_height = image.size
    orig_aspect = orig_width / orig_height
    target_aspect = target_width / target_height

    # Calculate fitted dimensions
    if orig_aspect > target_aspect:
        # Fit to width
        new_width = target_width
        new_height = int(target_width / orig_aspect)
    else:
        # Fit to height
        new_height = target_height
        new_width = int(target_height * orig_aspect)

    # Resize image
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Create canvas with background
    canvas = Image.new('RGB', (target_width, target_height), background_color)

    # Paste resized image centered
    x = (target_width - new_width) // 2
    y = (target_height - new_height) // 2
    canvas.paste(resized, (x, y))

    return canvas


def export_for_platform(
    source_path,
    platform_spec,
    output_path,
    format_spec=None,
    smart_crop_enabled=True,
    preserve_aspect=False
):
    """
    Export thumbnail for specific platform

    Args:
        source_path: Path to source thumbnail
        platform_spec: Platform specification dict
        output_path: Output file path
        format_spec: Format specification dict (format, quality)
        smart_crop_enabled: Use face detection for cropping
        preserve_aspect: Maintain aspect ratio (letterbox) or force dimensions (crop)

    Returns:
        Dict with export result
    """
    try:
        print_log(f"Exporting for {platform_spec['displayName']}...")

        # Load source image
        image = Image.open(source_path)
        if image.mode != 'RGB':
            image = image.convert('RGB')

        target_width = platform_spec['dimensions']['width']
        target_height = platform_spec['dimensions']['height']

        # Detect faces if smart crop enabled
        face_center = None
        if smart_crop_enabled and not preserve_aspect:
            face_center = detect_faces_for_crop(source_path)
            if face_center:
                print_log(f"  Detected faces at: {face_center}")

        # Process image
        if preserve_aspect:
            # Fit with letterboxing
            processed = fit_contain(image, target_width, target_height)
        else:
            # Smart crop
            processed = smart_crop(image, target_width, target_height, face_center)

        # Determine format
        if format_spec:
            output_format = format_spec.get('format', platform_spec['recommendedFormat']).upper()
            quality = format_spec.get('quality', 90)
        else:
            output_format = platform_spec['recommendedFormat'].upper()
            quality = 90

        # Save
        if output_format == 'JPEG' or output_format == 'JPG':
            processed.save(output_path, 'JPEG', quality=quality, optimize=True)
        elif output_format == 'PNG':
            processed.save(output_path, 'PNG', optimize=True)
        elif output_format == 'WEBP':
            processed.save(output_path, 'WEBP', quality=quality)
        else:
            processed.save(output_path)

        # Get file size
        file_size = os.path.getsize(output_path)

        print_log(f"  ✓ Exported: {os.path.basename(output_path)} ({file_size // 1024} KB)")

        return {
            'platformId': platform_spec['id'],
            'platformName': platform_spec['displayName'],
            'filePath': output_path,
            'dimensions': {'width': target_width, 'height': target_height},
            'fileSize': file_size,
            'format': output_format.lower(),
            'success': True
        }

    except Exception as e:
        print_log(f"  ✗ Export failed: {e}")
        return {
            'platformId': platform_spec['id'],
            'platformName': platform_spec['displayName'],
            'filePath': '',
            'dimensions': {'width': 0, 'height': 0},
            'fileSize': 0,
            'format': '',
            'success': False,
            'error': str(e)
        }


def multi_export(
    source_path,
    platform_specs,
    output_dir,
    base_filename=None,
    format_spec=None,
    smart_crop=True,
    preserve_aspect=False
):
    """
    Export thumbnail for multiple platforms

    Args:
        source_path: Path to source thumbnail
        platform_specs: List of platform specification dicts
        output_dir: Output directory
        base_filename: Base filename (without extension)
        format_spec: Format specification dict
        smart_crop: Use face detection
        preserve_aspect: Maintain aspect ratio

    Returns:
        Dict with multi-export results
    """
    print_log(f"Starting multi-platform export...")
    print_log(f"Source: {source_path}")
    print_log(f"Platforms: {len(platform_specs)}")

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Determine base filename
    if not base_filename:
        base_filename = Path(source_path).stem

    results = []

    for platform_spec in platform_specs:
        # Generate output filename
        platform_id = platform_spec['id']
        format_ext = (format_spec.get('format') if format_spec else platform_spec['recommendedFormat'])
        output_filename = f"{base_filename}_{platform_id}.{format_ext}"
        output_path = os.path.join(output_dir, output_filename)

        # Export
        result = export_for_platform(
            source_path,
            platform_spec,
            output_path,
            format_spec,
            smart_crop,
            preserve_aspect
        )

        results.append(result)

    # Count successes/failures
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]

    print_log(f"\n✅ Multi-export complete!")
    print_log(f"   Exported: {len(successful)}/{len(platform_specs)}")
    if failed:
        print_log(f"   Failed: {len(failed)}")

    return {
        'success': len(failed) == 0,
        'results': results,
        'totalExported': len(successful),
        'totalFailed': len(failed),
        'outputDir': output_dir
    }


def main():
    parser = argparse.ArgumentParser(description='Multi-Platform Thumbnail Export')
    parser.add_argument('--source', required=True, help='Source thumbnail path')
    parser.add_argument('--platforms', required=True, help='JSON array of platform specs')
    parser.add_argument('--output-dir', required=True, help='Output directory')
    parser.add_argument('--base-filename', help='Base filename')
    parser.add_argument('--format', help='JSON format spec')
    parser.add_argument('--smart-crop', type=bool, default=True, help='Enable smart crop')
    parser.add_argument('--preserve-aspect', type=bool, default=False, help='Preserve aspect ratio')

    args = parser.parse_args()

    try:
        # Parse platform specs
        platform_specs = json.loads(args.platforms)

        # Parse format spec if provided
        format_spec = None
        if args.format:
            format_spec = json.loads(args.format)

        # Run multi-export
        result = multi_export(
            args.source,
            platform_specs,
            args.output_dir,
            args.base_filename,
            format_spec,
            args.smart_crop,
            args.preserve_aspect
        )

        # Output JSON result
        print(json.dumps(result))

        return 0 if result['success'] else 1

    except Exception as e:
        print_log(f"Error: {e}")
        import traceback
        print_log(traceback.format_exc())

        error_result = {
            'success': False,
            'results': [],
            'totalExported': 0,
            'totalFailed': 0,
            'outputDir': args.output_dir,
            'error': str(e)
        }

        print(json.dumps(error_result))
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
