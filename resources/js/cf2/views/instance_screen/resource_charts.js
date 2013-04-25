/**
 *
 * Creates resource charts that can be used to determine whether or not a change in resource usage will cause the user
 * to exceed their quota.
 *
 */
Atmo.Views.ResourceCharts = Backbone.View.extend({
	initialize: function(options) {
		this.quota_type = options.quota_type; // REQUIRED. Options: mem, cpu, disk, disk_count

		// If provider_id and identity_id are not provided, defaults to using the selected provider/identity
		if (options.provider_id && options.identity_id) {
			this.provider_id = options.provider_id;
			this.identity_id = options.identity_id;
		}
	},
	render: function() {

		var used = 0;		// Units of quota used
		var total = 0;		// Units of quota available
		var self = this;

		// First, determine which data we will use to create the charts -- selected provider, or data provided by AJAX calls
		if (this.provider_id && this.identity_id) {
			this.pull_cloud_data(this.provider_id, this.identity_id, this.quota_type);
		}
		else {
			total = Atmo.profile.get('selected_identity').get('quota')[this.quota_type];

			if (this.quota_type == 'disk') {
				$.each(Atmo.volumes.models, function(i, volume) {
					used += parseInt(volume.get('size'));
				});
			}
			else if (this.quota_type == 'disk_count') {
				used = Atmo.volumes.models.length;
			}
			else if (this.quota_type == 'cpu' || this.quota_type == 'mem') {

				if (Atmo.instance_types.models.length > 0) {
					$.each(Atmo.instances.get_active_instances(), function(i, instance) {
						var instance_type = instance.get('type');
						var to_add = _.filter(Atmo.instance_types.models, function(model) {
							return model.attributes.alias == instance_type;
						});
						used += to_add[0].attributes[self.quota_type];
					});
				}
				else {
					// Indicates error loading instance types
					var info_holder = self.$el.parent().find('#' + self.quota_type + 'Holder_info');
					var info = 'Could not calculate resource usage for ';
					info += (self.quota_type == 'cpu') ? 'CPU usage' : 'memory usage';
					info_holder.html(info);

					// this.$el is the graph container
					this.$el.addClass('graphBar');
					this.$el.append('<div style="color: rgb(165, 42, 42); margin: 9px 10px 0px"><span>Unavailable</span></div>');
					return this;
				}
			}

			// Make chart with our data
			this.make_chart(used, total);
		}

		return this;

	},
	pull_cloud_data: function(provider, identity, quota_type) {
		
		var total = 0, used = 0;
		var self = this;
		var fetch_errors = 0;

		// Get the quota, then get the quantity used
		$.ajax({
			type: 'GET',
			async: false,
			url: site_root + '/api/provider/' + provider + '/identity/' + identity,
			success: function(response_text) {
				console.log("total", total);
				total = response_text["quota"][quota_type];
			},
			error: function() {
				fetch_errors++;

				// Error Handling
				var info_holder = self.$el.parent().find('#' + quota_type + 'Holder_info');
				info_holder.html('Could not fetch ' + quota_type + ' quota. ');

				// this.$el is the graph container
				self.$el.addClass('graphBar');
				self.$el.append('<div style="color: rgb(165, 42, 42); margin: 9px 10px 0px"><span>Unavailable</span></div>');
			}
		});

		if (fetch_errors > 0) // Prevent unnecessary ajax calls if already in error state
			return;

		// Volume-related Quotas
		if (quota_type == 'disk' || quota_type == 'disk_count') {

			$.ajax({
				type: 'GET',
				url: site_root + '/api/provider/' + provider + '/identity/' + identity + '/volume/',
				success: function(volumes) {

					if (quota_type == 'disk') {
						for (var i = 0; i < volumes.length; i++) {
							used += parseInt(volumes[i].size);
						}
					}
					else if (quota_type == 'disk_count') {
						used = volumes.length;
					}

					// Make chart with our data
					self.make_chart(used, total);
				},
				error: function() {
					// Error handling
					var info_holder = self.$el.parent().find('#' + quota_type + 'Holder_info');
					var info = 'Could not fetch volume ';
					info += (quota_type == 'disk') ? 'capacity quota.' : 'quantity quota.';
					info_holder.html(info);

					// this.$el is the graph container
					self.$el.addClass('graphBar');
					self.$el.append('<div style="color: rgb(165, 42, 42); margin: 9px 10px 0px"><span>Unavailable</span></div>');
				}

			});

		}
		// Instance-related Quotas
		else if (quota_type == 'mem' || quota_type == 'cpu') {
			
			var instances;

			// Get instances
			$.ajax({
				type: 'GET',
				async: false,
				url: site_root + '/api/provider/' + provider + '/identity/' + identity + '/instance/',
				success: function(response_text) {
					instances = response_text;
				},
				error: function() {
					fetch_errors++;

					// Error Handling
					var info_holder = self.$el.parent().find('#' + quota_type + 'Holder_info');
					var info = 'Could not fetch instance ';
					info += (quota_type == 'mem') ? 'memory quota.' : 'CPU quota.';
					info_holder.html(info);

					// this.$el is the graph container
					self.$el.addClass('graphBar');
					self.$el.append('<div style="color: rgb(165, 42, 42); margin: 9px 10px 0px"><span>Unavailable</span></div>');
				}
			});

			if (fetch_errors > 0) // Prevent unnecessary ajax calls if already in error state
				return;

			// Get instance sizes
			$.ajax({
				type: 'GET',
				url: site_root + '/api/provider/' + provider + '/identity/' + identity + '/size/',
				success: function(instance_types) {

					// Filter out any instances that aren't active
					instances = _.filter(instances, function(instances) {
						return instance.get('state') != 'suspended' && instance.get('state') != 'stopped';
					});

					// Add together quota used by instances cumulatively 
					for (var i = 0; i < instances.length; i++) {
						var size_alias = instances[i].size_alias;
						var to_add = _.filter(instance_types, function(type) {
							return type.alias == size_alias;
						});
						used += to_add[0][quota_type];	
					}
					
					if (quota_type == 'mem') 
						total *= 1024;
						
					// Make chart with our data
					self.make_chart(used, total);
				},
				error: function() {
					// Error Handling
					var info_holder = self.$el.parent().find('#' + quota_type + 'Holder_info');
					info_holder.html('Could not fetch instance types. ');

					// this.$el is the graph container
					self.$el.addClass('graphBar');
					self.$el.append('<div style="color: rgb(165, 42, 42); margin: 9px 10px 0px"><span>Unavailable</span></div>');
				}
			});
		}
	},
	choose_color: function(percent) {
		if (percent < 50)
			return 'greenGraphBar';
		else if (percent >= 50 && percent <= 100)
			return 'orangeGraphBar';
		else
			return 'redGraphBar';
	},
	make_usage_bar: function(percent, cssPercent, options) {

		// Style the usage bar
		var usage_bar = $('<div>', {
			style: 'width: 0%',
			html: function() {
				if (options && options.show_percent)
					return '<span>' + percent + '%</span>';
				else
					return '';
			}
		});
		
		if (options && options.show_color)
			usage_bar.addClass(this.choose_color(percent));
		
		if (usage_bar.width() < 10)
			usage_bar.css('color', '#000');
		else
			usage_bar.css('color', '#FFF');

		return usage_bar;
	},
	make_chart: function(used, total) {
		
		// this.$el is the graph container
		this.$el.addClass('graphBar');

		var percent = 0, cssPercent = 0;

		if (used > 0) {
			percent = Math.floor((used / total) * 100);
			cssPercent = (percent > 100) ? 100 : percent;
		}
		else {
			percent = 0;
			cssPercent = 0;
		}

		// Only create a new div element if one doesn't exist already that we can grow.
		var existing_bar = this.$el.find('[class$="GraphBar"]');

		// Slowly remove the added usage bar
		if (this.$el.find('.addedUsageBar').length > 0) {
			this.$el.find('.addedUsageBar').attr('class', '').addClass('addedUsageBar');
			this.$el.find('.addedUsageBar').addClass(this.choose_color(cssPercent));
			this.$el.find('.addedUsageBar').css('width', '0%');

			// Remove when bar has finished disappearing
			setTimeout(function() {
				$(existing_bar[0]).removeClass('barFlushLeft');
			}, 2 * 1000);
		}

		existing_bar = $(existing_bar[0]);
		var usage_bar;

		if (existing_bar.length == 0)
			usage_bar = this.make_usage_bar(percent, cssPercent, { show_percent: true, show_color: true });
		else {
			usage_bar = existing_bar;
			usage_bar.attr('class', '');
			usage_bar.addClass(this.choose_color(cssPercent));
		}

		usage_bar.css('width', '' + cssPercent + '%');

		if (usage_bar != existing_bar)
			this.$el.html(usage_bar);

		this.$el.data('used', used);
		this.$el.data('total', total);

		this.show_quota_info(used, total, false, true);
	},
	/** 
	 * Populates the informational field below the graph to tell the user exactly what their resource usage is. 
	 */
	show_quota_info: function(used, total, is_projected, under_quota) {
		// is_projected: boolean, should quota denote future use or current use
		
		var info = '';

		if (this.quota_type == 'cpu') {
			this.$el.data('unit', 'CPUs');
			info = used + ' of ' + total + ' available CPUs.';
		}
		else if (this.quota_type == 'mem') {

			// Determine whether memory should be in GB or MB
			this.$el.data('unit', 'memory');
			var digits = (used % 1024 == 0) ? 0 : 1;
			var readable_used = (used >= 1024) ? ('' + (used / 1024).toFixed(digits) + ' GB') : ('' + used + ' MB');

			info = readable_used + ' of ' + (total / 1024) + ' GB allotted memory.';
		}
		else if (this.quota_type == 'disk') {
			this.$el.data('unit', 'storage');
			info = used + ' of ' + total + ' GB available storage.';
		}
		else if (this.quota_type == 'disk_count') {
			this.$el.data('unit', 'volumes');
			info = used + ' of ' + total + ' available volumes.';
		}

		if (is_projected)
			info = 'You will use ' + info;
		else
			info = 'You are using ' + info;

		if (!under_quota) {
			info = '<strong>Quota Exceeded.</strong> ';

			if (this.quota_type == 'mem' || this.quota_type == 'cpu')
				info += 'Choose a smaller size or terminate a running instance.';
			else if (this.quota_type == 'disk')
				info += 'Choose a smaller size or destroy an existing volume.';
			else if (this.quota_type == 'disk_count')
				info += 'You must destroy an existing volume or request more resources.';
		}

		// Place info into sibling div element
		var info_holder = this.$el.parent().find('#' + this.quota_type + 'Holder_info');
		info_holder.html(info);

	},
	/**
	 * Adds predicted usage to user's resource charts and determines whether or not the user would be under quota.
	 */
	add_usage: function(to_add, options) {
		
		var under_quota;

		var info_holder = this.$el.parent().find('#' + this.quota_type + 'Holder_info');
		to_add = parseFloat(to_add);

		// Empty the existing parts
		//this.$el.html('');	

		var new_usage = Math.round((to_add / this.$el.data('total')) * 100);
		var current_usage = Math.floor((this.$el.data('used') / this.$el.data('total')) * 100);
		var total_usage = Math.floor(((to_add + this.$el.data('used')) / this.$el.data('total')) * 100);
		var new_cssPercent = 0;
		
		var under_quota = (total_usage > 100) ? false : true;

		// Create new usage bars
		if (current_usage > 0 && current_usage < 100) {

			// Determine the size of the added part
			if (total_usage > 100)
				new_cssPercent = 100 - current_usage;
			else
				new_cssPercent = new_usage;

			var current_bar = this.$el.find('[class$="GraphBar"]');
			current_bar = $(current_bar[0]);

			if (current_bar.length == 0)
				var current_bar = this.make_usage_bar(current_usage, current_usage, { show_percent: false, show_color: false });

			current_bar.html('<span>' + total_usage + '%</span>');
			current_bar.attr('class', '');
			current_bar.addClass('barFlushLeft');
			current_bar.addClass(this.choose_color(total_usage));

			var added_bar = this.$el.find('.addedUsageBar');
			added_bar = $(added_bar[0]);

			if (added_bar.length == 0)
				added_bar = this.make_usage_bar(new_usage, new_cssPercent, { show_percent: false, show_color: false });

			added_bar.attr('class', '');
			added_bar.addClass(this.choose_color(total_usage));
			added_bar.css('opacity', 0.5);
			added_bar.addClass('addedUsageBar');

			// Only append if they didn't exist before
			if (this.$el.find('.addedUsageBar').length == 0) {
				this.$el.append(added_bar);
				setTimeout(function() {
					current_bar.css('width', '' + current_usage + '%');
					added_bar.css('width', '' + new_cssPercent + '%');
				}, 0.5 * 1000);
			}
			else {
				current_bar.css('width', '' + current_usage + '%');
				added_bar.css('width', '' + new_cssPercent + '%');
			}
		}
		else {
		
			// User is already over quota
			if (total_usage > 100)
				new_cssPercent = 100;
			else
				new_cssPercent = new_usage;

			var added_bar = this.make_usage_bar(total_usage, new_cssPercent, { show_percent: true, show_color: true });
			added_bar.css('opacity', 0.5);
			added_bar.css('color', '#000');
			this.$el.html(added_bar);
			added_bar.css('width', '' + new_cssPercent + '%');
		}

		this.show_quota_info((this.$el.data('used') + to_add), this.$el.data('total'), true, under_quota);

		// Return: whether the user is under their quota with the added usage
		return under_quota;

	},
	/* Only used when user is resizing instance to a smaller size */
	sub_usage: function(to_sub, options) {

		var under_quota;

		var info_holder = this.$el.parent().find('#' + this.quota_type + 'Holder_info');
		to_sub = parseFloat(to_sub);

		// Empty the existing parts
		//this.$el.html('');	

		var current_usage = Math.floor((to_sub / this.$el.data('total')) * 100);
		var projected_usage = Math.floor((this.$el.data('used') / this.$el.data('total')) * 100) - current_usage;
		var total_usage = Math.floor(((this.$el.data('used') - to_sub) / this.$el.data('total')) * 100);

		// Create new usage bars -- only if necessary, though
		var projected_bar;
		var existing_projected = this.$el.find('[class$="GraphBar"]');
		existing_projected = $(existing_projected[0]);

		if (existing_projected.length == 0)
			projected_bar = this.make_usage_bar(projected_usage, projected_usage, { show_percent: false, show_color: false });
		else
			projected_bar = existing_projected;

		projected_bar.html('<span>' + total_usage + '%</span>');
		projected_bar.attr('class', '');
		projected_bar.addClass('barFlushLeft');
		projected_bar.addClass(this.choose_color(total_usage));

		// Create current bar -- only if necessary
		var existing_current = this.$el.find('.addedUsageBar')[0];
		existing_current = $(existing_current);

		if (existing_current.length == 0)
			current_bar = this.make_usage_bar(current_usage, current_usage, { show_percent: false, show_color: false });
		else
			current_bar = existing_current;

		current_bar.attr('class', '');
		current_bar.addClass(this.choose_color(total_usage));

		// If you're not subtracting any usage, make up for the fact that projected bar will be 0%
		if (to_sub > 0) {
			current_bar.css('opacity', 0.5);
			current_bar.addClass('addedUsageBar');
		}
		else {
			projected_bar.removeClass('barFlushLeft');
		}

		if (to_sub > 0 && projected_usage == 0) {
			current_bar.html('<span>' + total_usage + '%</span>');
			projected_bar.html('');
		}

		if (projected_bar != existing_projected)
			this.$el.html(projected_bar);
		if (current_bar != existing_current)
			this.$el.html(projected_bar).append(current_bar);

		//if (projected_bar == existing_projected && current_bar == existing_current) {
			projected_bar.css('width', '' + projected_usage + '%');
			current_bar.css('width', '' + current_usage + '%');
		//}
		//else {
		//	setTimeout(function() {
		//		projected_bar.css('width', '' + projected_usage + '%');
		//		current_bar.css('width', '' + current_usage + '%');
		//	}, 1.5 * 1000);
		//}

		this.show_quota_info((this.$el.data('used') - to_sub), this.$el.data('total'), true, true);

		// When a user is resizing an instance lower, they will always be under quota
		return true;
	}
});
