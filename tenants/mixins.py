from rest_framework.exceptions import PermissionDenied


class BusinessScopedMixin:
    """Gives a view the logged-in owner's business, so every query can be limited to it."""

    def get_business(self):
        if not hasattr(self, "_business"):
            self._business = self.request.user.businesses.filter(is_active=True).first()
            if self._business is None:
                raise PermissionDenied("This account has no active business.")
        return self._business