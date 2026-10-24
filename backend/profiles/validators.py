import os
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024       # 5 MB
MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024        # 2 MB

ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.txt']
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

def validate_resume_file(file):
    """
    Validates that uploaded resume is under 5MB and has an allowed document extension.
    """
    if file.size > MAX_RESUME_SIZE_BYTES:
        raise ValidationError(
            _('Resume file size exceeds maximum permitted limit of 5MB.')
        )

    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise ValidationError(
            _(f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_RESUME_EXTENSIONS)}.")
        )


def validate_portfolio_image(image):
    """
    Validates portfolio showcase image size and extension.
    """
    if image.size > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(
            _('Portfolio image exceeds maximum permitted size of 2MB.')
        )

    ext = os.path.splitext(image.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            _(f"Unsupported image format '{ext}'. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}.")
        )
