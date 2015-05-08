from django.db.models import Q
from django.utils import timezone


def only_current_provider(now_time=None):
    """
    Use this query on any model with a 'provider.end_date'
    to limit the objects to those
    that have not past their end_date
    """
    if not now_time:
        now_time = timezone.now()
    return Q(provider__end_date__isnull=True) | Q(provider__end_date__gt=now_time)


def only_current_machines(now_time=None):
    """
    Use this query on any model with 'provider_machine.end_date'
    to limit the objects to those
    that have not past their end_date
    """
    if not now_time:
        now_time = timezone.now()
    return (Q(versions__machines__instance_source__end_date__isnull=True) |
            Q(versions__machines__instance_source__end_date__gt=now_time))

def only_current_machines_in_version(now_time=None):
    if not now_time:
        now_time = timezone.now()
    return (Q(machines__instance_source__end_date__isnull=True) |
            Q(machines__instance_source__end_date__gt=now_time))

def only_current_source(now_time=None):
    """
    Use this query on any model with 'instance_source.end_date'
    to limit the objects to those
    that have not past their end_date
    """
    if not now_time:
        now_time = timezone.now()
    return (Q(instance_source__end_date__isnull=True) |
            Q(instance_source__end_date__gt=now_time))


def only_current(now_time=None):
    """
    Use this query on any model with 'end_date'
    to limit the objects to those
    that have not past their end_date
    """
    if not now_time:
        now_time = timezone.now()
    return Q(end_date=None) | Q(end_date__gt=now_time)


def _active_identity_membership(user, now_time=None):
    from core.models import IdentityMembership
    if not now_time:
        now_time = timezone.now()
    return IdentityMembership.objects.filter(
        Q(identity__provider__end_date__isnull=True) |\
        Q(identity__provider__end_date__gt=now_time),
        identity__provider__active=True,
        member__user__username=user.username)

def _membership_for_user(user):
    if not user:
        return Q()
    return Q(group__id__in=user.group_set.values('id'))
