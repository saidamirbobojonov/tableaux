from rest_framework.permissions import BasePermission
from .models import UserRole


class HasMembershipRole(BasePermission):
    """
    Base class. Subclasses declare allowed_roles.
    Checks that the authenticated user has an active Membership
    with one of the allowed roles in any organization.
    """
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superusers bypass role checks
        if request.user.is_superuser:
            return True
        return request.user.memberships.filter(
            role__in=self.allowed_roles,
            is_active=True
        ).exists()


class IsOwnerOrManager(HasMembershipRole):
    """OWNER, REGIONAL_MANAGER, BRANCH_MANAGER — full operational access."""
    allowed_roles = [
        UserRole.OWNER,
        UserRole.REGIONAL_MANAGER,
        UserRole.BRANCH_MANAGER,
    ]


class IsOwnerOrFinance(HasMembershipRole):
    """OWNER, REGIONAL_MANAGER, BRANCH_MANAGER, ACCOUNTANT — financial reports."""
    allowed_roles = [
        UserRole.OWNER,
        UserRole.REGIONAL_MANAGER,
        UserRole.BRANCH_MANAGER,
        UserRole.ACCOUNTANT,
    ]


class IsKitchenStaff(HasMembershipRole):
    """CHEF, BRANCH_MANAGER, OWNER — kitchen display access."""
    allowed_roles = [
        UserRole.CHEF,
        UserRole.BRANCH_MANAGER,
        UserRole.OWNER,
    ]


class IsStaff(HasMembershipRole):
    """Any staff role — access to orders and POS operations."""
    allowed_roles = [
        UserRole.WAITER,
        UserRole.CHEF,
        UserRole.BRANCH_MANAGER,
        UserRole.OWNER,
        UserRole.REGIONAL_MANAGER,
        UserRole.ACCOUNTANT,
    ]


class IsCashier(HasMembershipRole):
    """WAITER, BRANCH_MANAGER, OWNER — shift and POS operations."""
    allowed_roles = [
        UserRole.WAITER,
        UserRole.BRANCH_MANAGER,
        UserRole.OWNER,
    ]


def check_org_access(user, org_id):
    """
    Returns True if the user has an active Membership in this organization.
    Superusers always pass.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    from .models import Membership
    return Membership.objects.filter(
        user=user,
        organization_id=org_id,
        is_active=True
    ).exists()


def check_branch_access(user, branch_id):
    """
    Returns True if the user has an active Membership granting access to this branch.
    Superusers always pass. Empty allowed_branches means access to all org branches.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    from .models import Branch, Membership
    try:
        branch = Branch.objects.get(id=branch_id, is_deleted=False)
    except Branch.DoesNotExist:
        return False

    membership = Membership.objects.filter(
        user=user,
        organization=branch.organization,
        is_active=True
    ).first()

    if not membership:
        return False

    # Empty allowed_branches = full org access
    if not membership.allowed_branches.exists():
        return True

    return membership.allowed_branches.filter(id=branch_id).exists()
