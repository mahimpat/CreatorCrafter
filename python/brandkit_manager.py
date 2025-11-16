"""
Brand Kit Manager for Thumbnail Generation
Handles applying brand kit settings to thumbnails
"""

import json
import os
from typing import Dict, Any, Optional
from pathlib import Path


class BrandKitManager:
    """Manages brand kit application to thumbnails"""

    def __init__(self, brand_kits_dir: str = None):
        """
        Initialize brand kit manager

        Args:
            brand_kits_dir: Directory containing brand kit JSON files
        """
        if brand_kits_dir is None:
            # Default to user's home directory
            self.brand_kits_dir = os.path.join(os.path.expanduser('~'), '.creatorcrafter', 'brandkits')
        else:
            self.brand_kits_dir = brand_kits_dir

        os.makedirs(self.brand_kits_dir, exist_ok=True)

    def load_brand_kit(self, brand_kit_id: str) -> Optional[Dict[str, Any]]:
        """
        Load a brand kit from disk

        Args:
            brand_kit_id: ID of the brand kit to load

        Returns:
            Brand kit dict or None if not found
        """
        brand_kit_path = os.path.join(self.brand_kits_dir, f'{brand_kit_id}.json')

        if not os.path.exists(brand_kit_path):
            return None

        try:
            with open(brand_kit_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading brand kit: {e}")
            return None

    def save_brand_kit(self, brand_kit: Dict[str, Any]) -> bool:
        """
        Save a brand kit to disk

        Args:
            brand_kit: Brand kit dict to save

        Returns:
            True if successful, False otherwise
        """
        brand_kit_id = brand_kit.get('id')
        if not brand_kit_id:
            return False

        brand_kit_path = os.path.join(self.brand_kits_dir, f'{brand_kit_id}.json')

        try:
            with open(brand_kit_path, 'w') as f:
                json.dump(brand_kit, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving brand kit: {e}")
            return False

    def list_brand_kits(self) -> list:
        """
        List all available brand kits

        Returns:
            List of brand kit metadata dicts
        """
        brand_kits = []

        try:
            for filename in os.listdir(self.brand_kits_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.brand_kits_dir, filename)
                    with open(filepath, 'r') as f:
                        brand_kit = json.load(f)
                        # Return only metadata
                        brand_kits.append({
                            'id': brand_kit.get('id'),
                            'name': brand_kit.get('name'),
                            'description': brand_kit.get('description'),
                            'createdAt': brand_kit.get('createdAt'),
                            'updatedAt': brand_kit.get('updatedAt')
                        })
        except Exception as e:
            print(f"Error listing brand kits: {e}")

        return brand_kits

    def delete_brand_kit(self, brand_kit_id: str) -> bool:
        """
        Delete a brand kit

        Args:
            brand_kit_id: ID of the brand kit to delete

        Returns:
            True if successful, False otherwise
        """
        brand_kit_path = os.path.join(self.brand_kits_dir, f'{brand_kit_id}.json')

        if not os.path.exists(brand_kit_path):
            return False

        try:
            os.remove(brand_kit_path)
            return True
        except Exception as e:
            print(f"Error deleting brand kit: {e}")
            return False

    def apply_brand_kit_to_options(self, brand_kit: Dict[str, Any], template: str) -> Dict[str, Any]:
        """
        Convert brand kit to thumbnail generation options

        Args:
            brand_kit: Brand kit dict
            template: Template ID

        Returns:
            Dict with text colors, gradients, and style options
        """
        text_style = brand_kit.get('textStyle', {})
        primary_color = brand_kit.get('primaryColor', {})
        secondary_color = brand_kit.get('secondaryColor', {})
        accent_color = brand_kit.get('accentColor', {})
        outline_color = brand_kit.get('outlineColor', {})

        # Build gradient colors from brand kit
        gradient_colors = [
            tuple(primary_color.get('rgb', [255, 215, 0])),
            tuple(secondary_color.get('rgb', [255, 165, 0])),
            tuple(accent_color.get('rgb', [255, 0, 0]))
        ]

        options = {
            'gradient_colors': gradient_colors,
            'outline_color': outline_color.get('hex', '#000000'),
            'outline_width': text_style.get('outlineWidth', 8),
            'enable_3d': text_style.get('enable3D', False),
            'enable_neon': text_style.get('enableNeon', False),
            'enable_gradients': text_style.get('enableGradients', True),
            'font_size_multiplier': text_style.get('defaultSize', 18) / 18.0  # Normalize to 18% baseline
        }

        # Check for template-specific overrides
        template_prefs = brand_kit.get('templatePreferences', {}).get(template, {})
        if template_prefs:
            if 'textColor' in template_prefs:
                # Parse hex to RGB
                hex_color = template_prefs['textColor'].lstrip('#')
                rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
                options['gradient_colors'] = [rgb]  # Override with solid color
            if 'outlineColor' in template_prefs:
                options['outline_color'] = template_prefs['outlineColor']

        # Add logo/watermark info if present
        logo = brand_kit.get('logo')
        if logo:
            options['logo'] = {
                'path': logo.get('path'),
                'position': logo.get('position', 'bottom-right'),
                'size': logo.get('size', 10),
                'opacity': logo.get('opacity', 100)
            }

        watermark = brand_kit.get('watermark')
        if watermark:
            options['watermark'] = {
                'path': watermark.get('path'),
                'position': watermark.get('position', 'bottom-right'),
                'size': watermark.get('size', 5),
                'opacity': watermark.get('opacity', 50)
            }

        return options


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb: tuple) -> str:
    """Convert RGB tuple to hex color"""
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])
