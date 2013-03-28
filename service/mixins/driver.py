"""
Atmosphere service mixin driver
Mixin classes implement additional functionality for Drivers.
"""

class MetaMixin():
    def meta(self, *args, **kwargs):
        return self.provider.metaCls.create_meta(self, *args, **kwargs)

class APIFilterMixin():
    """
    APIFilterMixin provides filtering for libcloud and esh drivers.
    """

    def get_volume(self, alias):
        try:
            volume_list = self.list_volumes()
            volume = filter(lambda volume: alias in volume.alias, volume_list)[0]
            return volume 
        except IndexError, no_vol:
            return None
    def get_size(self, alias):
        try:
            size_list = self.list_sizes()
            size = filter(lambda size: alias in size.id, size_list)[0]
            return size 
        except IndexError, no_size:
            return None
    def get_instance(self, alias):
        try:
            instance_list = self.list_instances()
            instance = filter(lambda instance: alias in instance.alias, instance_list)[0]
            return instance 
        except IndexError, no_inst:
            return None
    def get_machine(self, alias):
        try:
            machine_list = self.list_machines()
            machine = filter(lambda machine: alias in machine.alias, machine_list)[0]
            return machine 
        except IndexError, no_mach:
            return None
    def filter_volumes(self, volumes, black_list=[]):
        """
        Filtered volumes:
            Keep the volume if it does NOT match any word in the black_list
        """
        filtered  = [volume for volume in volumes if not any(word in volume.name for word in black_list)]
        return filtered
    def filter_sizes(self, sizes, black_list=[]):
        """
        Filtered sizes:
            Keep the size if it does NOT match any word in the black_list
        """
        filtered  = [size for size in sizes if not any(word in size.name for word in black_list)]
        return filtered
    def filter_instances(self, instances, black_list=[]):
        """
        Filtered instances:
            Keep the instance if it does NOT match any word in the black_list
        """
        filtered  = [instance for instance in instances if not any(word in instance.name for word in black_list)]
        return filtered
    def filter_machines(self, machines, black_list=[]):
        """
        Filtered machines:
            Keep the machine if it does NOT match any word in the black_list
        """
        filtered  = [machine for machine in machines if not any(word in machine.name for word in black_list)]
        return filtered