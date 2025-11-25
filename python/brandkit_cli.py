#!/usr/bin/env python3
"""
Brand Kit CLI - Command-line interface for brand kit management
"""

import sys
import json
import argparse
import os

# CRITICAL FIX: Add script directory to Python path for local imports
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from brandkit_manager import BrandKitManager


def main():
    parser = argparse.ArgumentParser(description='Brand Kit Manager CLI')
    parser.add_argument('action', choices=['list', 'load', 'save', 'delete'],
                       help='Action to perform')
    parser.add_argument('data', nargs='?', help='Brand kit ID or JSON data')

    args = parser.parse_args()
    manager = BrandKitManager()

    try:
        if args.action == 'list':
            brand_kits = manager.list_brand_kits()
            print(json.dumps(brand_kits))

        elif args.action == 'load':
            if not args.data:
                print(json.dumps({'error': 'Brand kit ID required'}), file=sys.stderr)
                sys.exit(1)

            brand_kit = manager.load_brand_kit(args.data)
            if brand_kit:
                print(json.dumps(brand_kit))
            else:
                print(json.dumps({'error': 'Brand kit not found'}), file=sys.stderr)
                sys.exit(1)

        elif args.action == 'save':
            if not args.data:
                print(json.dumps({'error': 'Brand kit JSON required'}), file=sys.stderr)
                sys.exit(1)

            brand_kit = json.loads(args.data)
            success = manager.save_brand_kit(brand_kit)

            if success:
                print(json.dumps({'success': True}))
            else:
                print(json.dumps({'error': 'Failed to save brand kit'}), file=sys.stderr)
                sys.exit(1)

        elif args.action == 'delete':
            if not args.data:
                print(json.dumps({'error': 'Brand kit ID required'}), file=sys.stderr)
                sys.exit(1)

            success = manager.delete_brand_kit(args.data)

            if success:
                print(json.dumps({'success': True}))
            else:
                print(json.dumps({'error': 'Failed to delete brand kit'}), file=sys.stderr)
                sys.exit(1)

    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
