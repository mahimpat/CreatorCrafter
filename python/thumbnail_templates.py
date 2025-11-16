#!/usr/bin/env python3
"""
Professional Thumbnail Templates
Curated library of 15 MrBeast/MKBHD-tier thumbnail templates
"""

# Template definitions - each template specifies all visual parameters
PROFESSIONAL_TEMPLATES = {
    # ==================== VIRAL/CLICKBAIT TEMPLATES ====================

    "mrbeast_classic": {
        "name": "MrBeast Classic",
        "category": "viral",
        "description": "Gold gradient text with 3D depth and red accent bars",
        "text": {
            "font_size": 140,
            "font_weight": "bold",
            "gradient_colors": [(255, 215, 0), (255, 165, 0), (255, 69, 0)],  # Gold to orange to red
            "outline_color": (0, 0, 0),
            "outline_width": 18,
            "shadow_layers": [
                {"offset": (8, 8), "color": (0, 0, 0), "alpha": 180},
                {"offset": (4, 4), "color": (0, 0, 0), "alpha": 140},
                {"offset": (2, 2), "color": (0, 0, 0), "alpha": 100}
            ],
            "position": "center_top",  # Top 1/3 of image
            "max_width_percent": 90,
            "enable_3d": True
        },
        "background": {
            "type": "gradient",
            "colors": [(30, 30, 60), (60, 30, 90)],  # Dark blue-purple
            "direction": "diagonal",
            "vignette": True
        },
        "elements": {
            "accent_bars": [
                {"position": "top", "height": 40, "color": (220, 20, 60), "alpha": 220},  # Crimson red
                {"position": "bottom", "height": 40, "color": (220, 20, 60), "alpha": 220}
            ]
        },
        "subject": {
            "remove_background": True,
            "edge_glow": True,
            "glow_color": (255, 215, 0),  # Gold
            "glow_width": 3,
            "saturation_boost": 1.3
        }
    },

    "shocked_face": {
        "name": "Shocked Face",
        "category": "viral",
        "description": "Large reaction face with emoji and curved arrow",
        "text": {
            "font_size": 110,
            "font_weight": "bold",
            "gradient_colors": [(255, 255, 255), (255, 255, 100)],  # White to yellow
            "outline_color": (0, 0, 0),
            "outline_width": 16,
            "shadow_layers": [
                {"offset": (6, 6), "color": (0, 0, 0), "alpha": 200}
            ],
            "position": "top_right",
            "max_width_percent": 45,
            "emoji_support": True
        },
        "background": {
            "type": "radial_gradient",
            "colors": [(255, 100, 100), (200, 50, 50)],  # Red explosion
            "center": (0.5, 0.5),
            "vignette": True
        },
        "elements": {
            "arrows": [
                {"type": "curved_red", "position": "point_to_face", "size": "large"}
            ],
            "emoji": [
                {"emoji": "😱", "position": "top_left", "size": 120}
            ]
        },
        "subject": {
            "remove_background": True,
            "position": "left_bottom",
            "scale": 1.2,  # Make face larger
            "edge_glow": True,
            "glow_color": (255, 255, 0),  # Yellow
            "saturation_boost": 1.4
        }
    },

    "before_after": {
        "name": "Before/After",
        "category": "viral",
        "description": "Split screen with VS text and comparison arrows",
        "text": {
            "font_size": 180,
            "font_weight": "black",
            "color": (255, 255, 255),
            "outline_color": (0, 0, 0),
            "outline_width": 20,
            "shadow_layers": [
                {"offset": (10, 10), "color": (0, 0, 0), "alpha": 200}
            ],
            "position": "center",
            "text_content": "VS",
            "max_width_percent": 20
        },
        "background": {
            "type": "split_vertical",
            "left_color": (100, 100, 255),  # Blue
            "right_color": (255, 100, 100),  # Red
            "split_position": 0.5
        },
        "elements": {
            "arrows": [
                {"type": "straight_left", "position": (0.25, 0.5), "color": (255, 255, 255)},
                {"type": "straight_right", "position": (0.75, 0.5), "color": (255, 255, 255)}
            ],
            "labels": [
                {"text": "BEFORE", "position": "top_left", "size": 60},
                {"text": "AFTER", "position": "top_right", "size": 60}
            ]
        },
        "subject": {
            "remove_background": True,
            "split_mode": True  # Show two versions side-by-side
        }
    },

    "mystery_reveal": {
        "name": "Mystery/Reveal",
        "category": "viral",
        "description": "Dark edges with mysterious WHAT?! text",
        "text": {
            "font_size": 150,
            "font_weight": "bold",
            "gradient_colors": [(255, 50, 50), (255, 150, 50)],  # Red to orange
            "outline_color": (255, 255, 255),
            "outline_width": 14,
            "shadow_layers": [
                {"offset": (8, 8), "color": (0, 0, 0), "alpha": 220}
            ],
            "position": "bottom",
            "rotation": -5,  # Slight tilt for drama
            "emoji_support": True
        },
        "background": {
            "type": "gradient",
            "colors": [(20, 20, 20), (60, 40, 80)],  # Dark with purple tint
            "direction": "radial",
            "vignette": True,
            "vignette_strength": 0.7  # Extra dark edges
        },
        "elements": {
            "emoji": [
                {"emoji": "❓", "position": "top_right", "size": 100},
                {"emoji": "❓", "position": "top_left", "size": 80}
            ],
            "circles": [
                {"type": "highlight_yellow", "position": "center_subject", "size": "medium"}
            ]
        },
        "subject": {
            "remove_background": True,
            "edge_glow": True,
            "glow_color": (255, 100, 100),
            "saturation_boost": 1.2
        }
    },

    # ==================== TECH/PROFESSIONAL TEMPLATES ====================

    "mkbhd_clean": {
        "name": "MKBHD Clean",
        "category": "tech",
        "description": "Bold white text with thin colored underline",
        "text": {
            "font_size": 120,
            "font_weight": "bold",
            "color": (255, 255, 255),
            "outline_color": (0, 0, 0),
            "outline_width": 8,
            "shadow_layers": [
                {"offset": (4, 4), "color": (0, 0, 0), "alpha": 150}
            ],
            "position": "bottom",
            "max_width_percent": 85,
            "underline": {
                "height": 6,
                "color": (220, 20, 60),  # Red accent
                "offset_y": 10
            }
        },
        "background": {
            "type": "solid",
            "color": (20, 20, 25),  # Almost black
            "noise_texture": True
        },
        "subject": {
            "remove_background": True,
            "position": "center",
            "edge_glow": True,
            "glow_color": (255, 255, 255),
            "glow_width": 2
        }
    },

    "tech_review": {
        "name": "Tech Review",
        "category": "tech",
        "description": "Blue gradient with tech badge and specs",
        "text": {
            "font_size": 100,
            "font_weight": "bold",
            "gradient_colors": [(100, 200, 255), (50, 150, 255)],  # Light to dark blue
            "outline_color": (0, 0, 0),
            "outline_width": 12,
            "shadow_layers": [
                {"offset": (5, 5), "color": (0, 0, 0), "alpha": 160}
            ],
            "position": "top",
            "max_width_percent": 80
        },
        "background": {
            "type": "gradient",
            "colors": [(30, 30, 50), (10, 40, 80)],  # Dark blue gradient
            "direction": "diagonal"
        },
        "elements": {
            "badge": {
                "position": "top_right",
                "text": "REVIEW",
                "background_color": (50, 150, 255),
                "size": 80
            },
            "bar": {
                "position": "bottom",
                "height": 120,
                "color": (20, 20, 30),
                "alpha": 200
            }
        },
        "subject": {
            "remove_background": True,
            "saturation_boost": 1.2
        }
    },

    "minimalist": {
        "name": "Minimalist",
        "category": "tech",
        "description": "Large bold text with subtle gradient",
        "text": {
            "font_size": 160,
            "font_weight": "black",
            "gradient_colors": [(255, 255, 255), (200, 200, 255)],  # White to light blue
            "outline_color": (0, 0, 0),
            "outline_width": 10,
            "shadow_layers": [
                {"offset": (6, 6), "color": (0, 0, 0), "alpha": 120}
            ],
            "position": "center",
            "max_width_percent": 75,
            "letter_spacing": 5
        },
        "background": {
            "type": "gradient",
            "colors": [(240, 240, 250), (220, 220, 240)],  # Very light, subtle
            "direction": "vertical"
        },
        "subject": {
            "remove_background": True,
            "position": "bottom_center",
            "scale": 0.8  # Smaller, subtle
        }
    },

    "comparison": {
        "name": "Comparison",
        "category": "tech",
        "description": "Side-by-side with checkmarks and X marks",
        "text": {
            "font_size": 90,
            "font_weight": "bold",
            "color": (255, 255, 255),
            "outline_color": (0, 0, 0),
            "outline_width": 10,
            "shadow_layers": [
                {"offset": (4, 4), "color": (0, 0, 0), "alpha": 150}
            ],
            "position": "top",
            "max_width_percent": 90
        },
        "background": {
            "type": "split_vertical",
            "left_color": (40, 40, 50),
            "right_color": (50, 40, 40),
            "split_position": 0.5
        },
        "elements": {
            "checkmarks": [
                {"emoji": "✓", "position": (0.25, 0.3), "size": 100, "color": (100, 255, 100)},
                {"emoji": "✗", "position": (0.75, 0.3), "size": 100, "color": (255, 100, 100)}
            ],
            "divider": {
                "position": "center_vertical",
                "width": 4,
                "color": (255, 255, 255)
            }
        },
        "subject": {
            "remove_background": True,
            "split_mode": True
        }
    },

    # ==================== GAMING TEMPLATES ====================

    "gaming_hype": {
        "name": "Gaming Hype",
        "category": "gaming",
        "description": "Neon colors with game logo and energy effects",
        "text": {
            "font_size": 130,
            "font_weight": "bold",
            "gradient_colors": [(255, 0, 255), (0, 255, 255)],  # Magenta to cyan
            "outline_color": (0, 0, 0),
            "outline_width": 16,
            "glow": True,
            "glow_color": (255, 0, 255),
            "glow_radius": 20,
            "shadow_layers": [
                {"offset": (8, 8), "color": (0, 0, 0), "alpha": 200}
            ],
            "position": "top",
            "max_width_percent": 85,
            "emoji_support": True
        },
        "background": {
            "type": "gradient",
            "colors": [(20, 0, 40), (0, 20, 40)],  # Dark purple to dark blue
            "direction": "diagonal",
            "noise_texture": True
        },
        "elements": {
            "energy_lines": [
                {"type": "diagonal", "color": (255, 0, 255), "width": 3},
                {"type": "diagonal", "color": (0, 255, 255), "width": 3}
            ]
        },
        "subject": {
            "remove_background": True,
            "edge_glow": True,
            "glow_color": (0, 255, 255),
            "glow_width": 4,
            "saturation_boost": 1.5
        }
    },

    "livestream": {
        "name": "Livestream",
        "category": "gaming",
        "description": "LIVE badge with bright colors and chat bubbles",
        "text": {
            "font_size": 110,
            "font_weight": "bold",
            "color": (255, 255, 255),
            "outline_color": (0, 0, 0),
            "outline_width": 14,
            "shadow_layers": [
                {"offset": (6, 6), "color": (0, 0, 0), "alpha": 180}
            ],
            "position": "bottom",
            "max_width_percent": 80
        },
        "background": {
            "type": "gradient",
            "colors": [(100, 50, 150), (50, 100, 200)],  # Purple to blue
            "direction": "diagonal"
        },
        "elements": {
            "live_badge": {
                "position": "top_left",
                "text": "🔴 LIVE",
                "background_color": (220, 20, 60),
                "size": 100,
                "pulse": True
            },
            "chat_bubbles": [
                {"position": "right", "size": 80, "alpha": 150}
            ]
        },
        "subject": {
            "remove_background": True,
            "edge_glow": True,
            "glow_color": (255, 50, 50),
            "saturation_boost": 1.3
        }
    },

    "reaction": {
        "name": "Reaction",
        "category": "gaming",
        "description": "Large face with game screenshot and emoji reactions",
        "text": {
            "font_size": 100,
            "font_weight": "bold",
            "gradient_colors": [(255, 255, 100), (255, 200, 50)],  # Yellow gradient
            "outline_color": (0, 0, 0),
            "outline_width": 12,
            "shadow_layers": [
                {"offset": (5, 5), "color": (0, 0, 0), "alpha": 160}
            ],
            "position": "top_right",
            "max_width_percent": 45,
            "emoji_support": True
        },
        "background": {
            "type": "screenshot_overlay",  # Special: uses game screenshot as background
            "blur": 15,
            "darken": 0.5
        },
        "elements": {
            "emoji_chain": [
                {"emoji": "😂", "position": (0.7, 0.2), "size": 80},
                {"emoji": "🔥", "position": (0.8, 0.4), "size": 70},
                {"emoji": "💯", "position": (0.9, 0.6), "size": 75}
            ]
        },
        "subject": {
            "remove_background": True,
            "position": "left_bottom",
            "scale": 1.3,  # Large face
            "edge_glow": True,
            "saturation_boost": 1.4
        }
    },

    # ==================== VLOG/LIFESTYLE TEMPLATES ====================

    "vlog_daily": {
        "name": "Vlog Daily",
        "category": "vlog",
        "description": "Colorful gradient with casual font and lifestyle emoji",
        "text": {
            "font_size": 120,
            "font_weight": "bold",
            "gradient_colors": [(255, 150, 200), (255, 200, 100), (150, 200, 255)],  # Pink-yellow-blue
            "outline_color": (255, 255, 255),
            "outline_width": 10,
            "shadow_layers": [
                {"offset": (5, 5), "color": (0, 0, 0), "alpha": 140}
            ],
            "position": "top",
            "max_width_percent": 85,
            "emoji_support": True,
            "casual_font": True
        },
        "background": {
            "type": "gradient",
            "colors": [(255, 200, 220), (200, 220, 255)],  # Pastel pink to blue
            "direction": "diagonal"
        },
        "elements": {
            "emoji_decoration": [
                {"emoji": "✨", "position": "top_left", "size": 70},
                {"emoji": "💖", "position": "top_right", "size": 75}
            ]
        },
        "subject": {
            "remove_background": True,
            "saturation_boost": 1.2
        }
    },

    "storytime": {
        "name": "Storytime",
        "category": "vlog",
        "description": "Speech bubble with emoji chain and warm colors",
        "text": {
            "font_size": 100,
            "font_weight": "bold",
            "color": (255, 255, 255),
            "outline_color": (100, 50, 150),  # Purple outline
            "outline_width": 12,
            "shadow_layers": [
                {"offset": (4, 4), "color": (0, 0, 0), "alpha": 150}
            ],
            "position": "in_bubble",
            "max_width_percent": 60,
            "emoji_support": True
        },
        "background": {
            "type": "gradient",
            "colors": [(255, 180, 150), (255, 150, 200)],  # Warm peachy pink
            "direction": "radial"
        },
        "elements": {
            "speech_bubble": {
                "position": "top_right",
                "size": "large",
                "color": (255, 255, 255)
            },
            "emoji_chain": [
                {"emoji": "😮", "position": (0.8, 0.3), "size": 60},
                {"emoji": "😱", "position": (0.85, 0.5), "size": 65},
                {"emoji": "😭", "position": (0.9, 0.7), "size": 70}
            ]
        },
        "subject": {
            "remove_background": True,
            "position": "left",
            "edge_glow": True,
            "saturation_boost": 1.2
        }
    },

    "challenge": {
        "name": "Challenge",
        "category": "vlog",
        "description": "Bold CHALLENGE banner with emoji and countdown",
        "text": {
            "font_size": 110,
            "font_weight": "black",
            "color": (255, 255, 255),
            "outline_color": (0, 0, 0),
            "outline_width": 16,
            "shadow_layers": [
                {"offset": (7, 7), "color": (0, 0, 0), "alpha": 200}
            ],
            "position": "center",
            "max_width_percent": 80,
            "emoji_support": True
        },
        "background": {
            "type": "gradient",
            "colors": [(255, 100, 50), (255, 50, 150)],  # Orange to pink
            "direction": "diagonal",
            "vignette": True
        },
        "elements": {
            "banner": {
                "position": "top",
                "text": "⚡ CHALLENGE ⚡",
                "background_color": (220, 20, 60),
                "height": 100
            },
            "countdown": {
                "position": "bottom_right",
                "text": "24HR",
                "size": 80,
                "color": (255, 255, 0)
            }
        },
        "subject": {
            "remove_background": True,
            "edge_glow": True,
            "glow_color": (255, 255, 0),
            "saturation_boost": 1.4
        }
    },

    "tutorial": {
        "name": "Tutorial",
        "category": "vlog",
        "description": "Step numbers with checklist and HOW TO badge",
        "text": {
            "font_size": 95,
            "font_weight": "bold",
            "color": (255, 255, 255),
            "outline_color": (0, 0, 0),
            "outline_width": 10,
            "shadow_layers": [
                {"offset": (4, 4), "color": (0, 0, 0), "alpha": 150}
            ],
            "position": "center",
            "max_width_percent": 85
        },
        "background": {
            "type": "gradient",
            "colors": [(50, 150, 200), (30, 100, 150)],  # Blue gradient
            "direction": "vertical"
        },
        "elements": {
            "how_to_badge": {
                "position": "top_left",
                "text": "HOW TO",
                "background_color": (50, 150, 200),
                "size": 90
            },
            "step_number": {
                "position": "top_right",
                "number": "1",
                "circle_color": (255, 200, 0),
                "size": 120
            },
            "checklist": {
                "position": "left",
                "items": 3,
                "size": 40
            }
        },
        "subject": {
            "remove_background": True,
            "position": "right",
            "saturation_boost": 1.15
        }
    }
}


def get_template(template_id):
    """Get template configuration by ID"""
    return PROFESSIONAL_TEMPLATES.get(template_id)


def list_templates():
    """List all available templates"""
    return list(PROFESSIONAL_TEMPLATES.keys())


def list_templates_by_category(category):
    """List templates filtered by category"""
    return [
        template_id for template_id, config in PROFESSIONAL_TEMPLATES.items()
        if config.get("category") == category
    ]


def get_template_categories():
    """Get all unique categories"""
    return list(set(config.get("category") for config in PROFESSIONAL_TEMPLATES.values()))
