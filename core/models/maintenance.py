import collections

from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models.provider import Provider


class MaintenanceRecord(models.Model):
    """
    Maintenace can be activated through the database
    """
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)
    title = models.CharField(max_length=256)
    message = models.TextField()
    provider = models.ForeignKey(Provider, blank=True, null=True)
    disable_login = models.BooleanField(default=True)

    @classmethod
    def active(cls, provider=None):
        now = timezone.now()
        records = MaintenanceRecord.objects.filter(
            Q(start_date__lte=now),
            Q(end_date__gt=now) | Q(end_date__isnull=True)
        )
        if provider:
            if isinstance(provider, collections.Iterable):
                records = records.filter(
                    Q(provider__in=provider) | Q(provider__isnull=True)
                )
            else:
                records = records.filter(
                    Q(provider__exact=provider) | Q(provider__isnull=True)
                )
        else:
            records = records.filter(Q(provider__isnull=True))
        return records

    def json(self):
        json = {
            'start': self.start_date,
            'end': self.end_date,
            'title': self.title,
            'message': self.message,
            'disable': self.disable_login,
        }
        if self.provider:
            json['provider'] = self.provider.location
        return json

    def __unicode__(self):
        return '%s (Maintenance Times: %s - %s Login disabled: %s)' % (
            self.title, self.start_date, self.end_date, self.disable_login
        )

    class Meta:
        db_table = "maintenance_record"
        app_label = "core"
