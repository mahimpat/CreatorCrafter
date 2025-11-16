"""
Generate Multiple Thumbnail Variations for A/B Testing
Creates different variations of a thumbnail with different templates, backgrounds, and styles
"""

import argparse
import json
import sys
from pathlib import Path
import thumbnail_generator as tg

def print_log(message):
    """Print log message to stderr"""
    print(message, file=sys.stderr)

def generate_variations(image_path, text, num_variations=4, brand_kit_id=None):
    """
    Generate multiple thumbnail variations for A/B testing

    Args:
        image_path: Path to source image
        text: Text overlay
        num_variations: Number of variations to generate (default 4)
        brand_kit_id: Optional brand kit ID

    Returns:
        List of dicts with variation details and paths
    """
    print_log(f"🎨 Generating {num_variations} thumbnail variations...")

    # Load brand kit if provided
    brand_kit_options = None
    if brand_kit_id:
        try:
            from brandkit_manager import BrandKitManager
            manager = BrandKitManager()
            brand_kit_data = manager.load(brand_kit_id)
            brand_kit_options = brand_kit_data
            print_log(f"✓ Loaded brand kit: {brand_kit_id}")
        except Exception as e:
            print_log(f"⚠ Could not load brand kit: {e}")

    # Define variation configurations
    variations = [
        {
            'name': 'Vibrant Gradient + MrBeast Style',
            'template': 'mrbeast',
            'background': 'gradient_blue',
            'description': 'Bold text, vibrant brand gradient background'
        },
        {
            'name': 'Dramatic White Text',
            'template': 'dramatic',
            'background': 'gradient_fire',
            'description': 'Maximum impact with large white text'
        },
        {
            'name': 'Tech Modern + Geometric',
            'template': 'tech',
            'background': 'pattern_hexagons',
            'description': 'Clean modern look with hexagon pattern'
        },
        {
            'name': 'Diagonal Dynamic',
            'template': 'diagonal',
            'background': 'pattern_diagonal_stripes',
            'description': 'Dynamic diagonal text with stripes'
        },
        {
            'name': 'Split-Screen Professional',
            'template': 'splitscreen',
            'background': 'gradient_sunset',
            'description': 'Professional split-screen composition'
        },
        {
            'name': 'Vlog Colorful + Dots',
            'template': 'vlog',
            'background': 'pattern_dots',
            'description': 'Fun and colorful with dot pattern'
        }
    ]

    # Select variations to generate
    selected_variations = variations[:min(num_variations, len(variations))]

    output_dir = Path(image_path).parent / 'thumbnail_variations'
    output_dir.mkdir(exist_ok=True)

    results = []

    for i, variation in enumerate(selected_variations):
        print_log(f"\n📸 Generating variation {i+1}/{len(selected_variations)}: {variation['name']}")

        # Generate output path
        output_filename = f"variation_{i+1}_{variation['template']}.png"
        output_path = str(output_dir / output_filename)

        try:
            # Generate thumbnail
            tg.add_text_overlay(
                image_path=image_path,
                text=text,
                template=variation['template'],
                output_path=output_path,
                background_type=variation['background'],
                brand_kit_options=brand_kit_options
            )

            results.append({
                'index': i + 1,
                'name': variation['name'],
                'template': variation['template'],
                'background': variation['background'],
                'description': variation['description'],
                'path': output_path,
                'success': True
            })

            print_log(f"✓ Saved: {output_path}")

        except Exception as e:
            print_log(f"❌ Failed to generate variation {i+1}: {e}")
            results.append({
                'index': i + 1,
                'name': variation['name'],
                'error': str(e),
                'success': False
            })

    # Generate summary
    successful = sum(1 for r in results if r.get('success', False))
    print_log(f"\n✅ Generated {successful}/{len(selected_variations)} variations successfully")
    print_log(f"📁 Output directory: {output_dir}")

    return results

def main():
    parser = argparse.ArgumentParser(description='Generate multiple thumbnail variations for A/B testing')
    parser.add_argument('--image', required=True, help='Path to source image')
    parser.add_argument('--text', required=True, help='Text overlay')
    parser.add_argument('--num-variations', type=int, default=4, help='Number of variations to generate')
    parser.add_argument('--brandkit-id', help='Brand kit ID (optional)')

    args = parser.parse_args()

    results = generate_variations(
        image_path=args.image,
        text=args.text,
        num_variations=args.num_variations,
        brand_kit_id=args.brandkit_id
    )

    # Output JSON results to stdout
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
