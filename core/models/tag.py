"""
  Service Tag models for Atmosphere.
"""

from django.db import models
from django.contrib.auth.models import User


class Tag(models.Model):
    name = models.SlugField(max_length=128)
    description = models.CharField(max_length=1024)
    #Not-Null="User-Specific"
    user = models.ForeignKey(User, null=True, blank=True)

    def __unicode__(self):
        return "%s" % (self.name,)

    def json(self):
        return {
            'name': self.name,
            'description': self.description,
            'author': self.user.username if self.user else 'None'
        }

    class Meta:
        db_table = 'tag'
        app_label = 'core'


def updateTags(coreObject, tagNameList, user=None):
    from core.models.instance import Instance
    from core.models.machine import Machine
    from core.models.machine_request import MachineRequest
    #Remove all tags from core*
    for tag in coreObject.tags.all():
        if type(coreObject) == Instance:
            tag.instance_set.remove(coreObject)
        elif type(coreObject) == Machine:
            tag.machine_set.remove(coreObject)
        elif type(coreObject) == MachineRequest:
            tag.machinerequest_set.remove(coreObject)
    #Add all tags in tagNameList to core*
    for tagName in tagNameList:
        (tag, created) = Tag.objects.get_or_create(name=tagName.strip())
        if created and user:
            tag.user = user
            tag.save()
        coreObject.tags.add(tag)
    return coreObject