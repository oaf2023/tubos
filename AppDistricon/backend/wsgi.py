"""
WSGI entry point for PythonAnywhere.
PythonAnywhere path: /var/www/tuusuario_pythonanywhere_com_wsgi.py

Contents of that file should be:
    import sys
    sys.path.insert(0, '/home/tuusuario/AppDistricon/backend')
    from wsgi import application  # noqa
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
application = create_app()

if __name__ == '__main__':
    application.run()
