Atmo.Views.SettingsScreenIdentitySummary = Backbone.View.extend({
    template: _.template(Atmo.Templates['identity_summary']),
	tagName: 'div',
	className: 'accordion-group',
	attributes: {'data-populated' : 'false'},
	initialize: function() {

        // Will need to bind: if user changed info about an identity, this.rerender_provider_data.

        this.provider = this.options.provider;
        this.identity_id = this.options.identity_id;

	    Atmo.profile.bind("change", this.render, this);
        Atmo.instances.bind("add", this.rerender_provider_data, this);
        Atmo.instances.bind("remove", this.rerender_provider_data, this);
        Atmo.instances.bind("change", this.rerender_provider_data, this);
        Atmo.volumes.bind("change", this.rerender_provider_data, this);
        Atmo.volumes.bind("add", this.rerender_provider_data, this);
        Atmo.volumes.bind("remove", this.rerender_provider_data, this);

		// Deal with all errors
		Atmo.profile.bind('fail', this.fail_profile, this);
		Atmo.instances.bind('fail', this.fail_instances, this);
		Atmo.volumes.bind('fail', this.fail_volumes, this);

        this.rendered = false;
	},
    events: {
        'click a.accordion-toggle' : 'render_provider_data',
        'click #help_edit_login_key' : 'edit_login_key',
    },
    render: function() {
        if (Atmo.profile.isNew() || this.rendered)
            return this;

        var self = this;

        var identity = { id: self.identity_id, provider: self.provider };

		var name = _.filter(Atmo.providers.models, function(provider) {
			return provider.get('id') == self.provider;	
		});
		identity.provider_name = name[0].attributes.type;

        this.$el.html(this.template(identity));

        if (Atmo.profile.get('selected_identity').id == self.identity_id) {
            this.$el.find('a.accordion-toggle').html(identity.provider_name + ' <span class="label" style="background-color: #0098aa">CURRENT</span><span class="caret"></span>');
            this.$el.find('.control_radio').attr('checked', 'checked');                        
        }


        $.ajax({
            type: 'GET',
            url: site_root + '/api/group/', 
            success: function(response_text) {
				self.identities = response_text[0].identities;
            },
			error: function() {
				Atmo.Utils.notify("Could not load all cloud identities", 'If the problem persists, please email <a href="mailto:support@iplantcollaborative.org">support@iplantcollaborative.org</a>', { no_timeout: true });
			},
            dataType: 'json'
        });

        // Point controls to this provider
        this.$el.find('#identity_num').attr('id', 'identity_'+self.identity_id);
        this.$el.find('a[href="#identity_num"]').attr('href', 'identity_'+self.identity_id);

        this.rendered = true;

		return this;
	},
    edit_login_key: function(e) {
            e.preventDefault();

            var header = 'Edit Cloud Identity';
            var content = '<form name="update_identity">';
            content += '<label for="login">Username</label>';
            content += '<input type="text" name="login" disabled="disabled" placeholder="'+Atmo.profile.get('id')+'"><br />';
            content += '<label for="key">Password</label>';
            content += '<span class="help-block"><a href="https://user.iplantcollaborative.org/reset/request">Reset Your Password</a></span>';
            content += '<label for="alias">New Alias</label>';
            content += '<input type="text" name="alias" value="' + Atmo.profile.get('id') + '" />';
            content += '</form>';

            Atmo.Utils.confirm(header, content, { on_confirm: function() {
                // Update stuff
            }, 
                ok_button: 'Update Identity'
            });

    },
    rerender_provider_data: function() {

        // Close any open accordions, and set all data as stale so that it will get re-rendered with updated data

		/* TO-DO: Fix this to work with individual identities.*/

        /*$.each(this.$el.find('.accordion-body'), function() {
            if (($(this).closest('.accordion-group').attr('data-populated') == "true") && ($(this).hasClass('in'))) {
                    $(this).collapse('hide');
            }
        });*/
        //this.$el.find('.accordion-body').collapse('hide');
        this.$el.find('.accordion-group').attr('data-populated', 'false');
    },
    render_provider_data: function(e) {

        var self = this;

        if ($(e.target).closest('.accordion-group').attr('data-populated') == "false") {

			// Help the user -- hide everything that's being appended until we get to the end. Meantime, show a spinny loader!

			// Keep track of any errors
			var errors = Array();

			self.$el.find('.accordion-inner').children().hide();

			var loader = $('<div>', {
				html: '<img src="'+site_root+'/resources/images/loader_large.gif" />',
				style: 'display: none; text-align: center;'
			});
			self.$el.find('.accordion-inner').prepend(loader);

			$(e.target).parent().parent().find('.accordion-body').collapse('toggle');
			loader.slideDown(400, function() {

				// Display the provider's resource charts
				self.cpu_resource_chart = new Atmo.Views.ResourceCharts({
					el: self.$el.find('#cpuHolder'),
					quota_type: 'cpu',
					provider_id: self.provider,
					identity_id: self.identity_id
				}).render();
				self.mem_resource_chart = new Atmo.Views.ResourceCharts({
					el: self.$el.find('#memHolder'),
					quota_type: 'mem',
					provider_id: self.provider,
					identity_id: self.identity_id
				}).render();

				// Get instances and volumes of this provider and identity 
				$.ajax({
					type: 'GET',
					url: site_root + '/api/provider/' + self.provider + '/identity/' + self.identity_id + '/instance/', 
					success: function(response_text) {
						self.instances = response_text;

						// Show all instances associated with this identity
						if (self.instances.length > 0) {

							var table = $('<table>', {
								class: 'table table-bordered'
							});

							table.append($('<thead>', {
								html: function() {
									var content = '<tr><td width="60%"><strong>Instance Name</strong></td>';
									content += '<td width="15%"><strong>Size</strong></td>';
									content += '<td width="25%"><strong>IP Address</strong></td></tr>';
									return content;
								}
							}));
							var tbody = $('<tbody>');
							for (var i = 0; i < self.instances.length; i++) {
								tbody.append($('<tr>', {
									html: function() {

										// Can we get an image URL here?
										//var img = '<img src="' + this.instances.models[i].get('image_url') + '" height="20" width="20" style="border: 1px solid #CCC"> ';
										
										var inst_name = self.instances[i]["name"];
										var content = '<td>'+ inst_name + '</td>';
										content += '<td>' + self.instances[i]['size_alias'] + '</td>';
										content += '<td>' + self.instances[i]['ip_address'] + '</td>';

										return content;
									}
								}));
							}
							table.append(tbody);
							self.$el.find('#instances_'+self.identity_id).html(table);

						}
					},
					error: function() {
						errors.push("Could not load instances for this cloud identity.");
						self.fail_instances();
					},
					dataType: 'json'
				});

				self.disk_count_resource_chart = new Atmo.Views.ResourceCharts({
					el: self.$el.find('#disk_countHolder'),
					quota_type: 'disk_count',
					identity_id: self.identity_id,
					provider_id: self.provider
				}).render();

				self.disk_resource_chart = new Atmo.Views.ResourceCharts({
					el: self.$el.find('#diskHolder'),
					quota_type: 'disk',
					identity_id: self.identity_id,
					provider_id: self.provider
				}).render();
				
				$.ajax({
					type: 'GET',
					url: site_root + '/api/provider/' + self.provider + '/identity/' + self.identity_id + '/volume/', 
					success: function(response_text) {
						self.volumes = response_text;


						if (self.volumes.length > 0) {
							var vol_table = $('<table>', {
								class: 'table table-bordered'
							});

							vol_table.append($('<thead>', {
								html: function() {
									var content = '<tr><td width="60%"><strong>Volume Name</strong></td>';
									content += '<td width="15%"><strong>Capacity</strong></td>';
									content += '<td width="25%"><strong>Status</strong></td></tr>';
									return content;
								}
							}));
							var vol_tbody = $('<tbody>');
							for (var i = 0; i < self.volumes.length; i++) {
								vol_tbody.append($('<tr>', {
									html: function() {

										var img = '<img src="' + site_root + '/resources/images/mini_vol.png"> ';
										var name = (self.volumes[i]['name'] || self.volumes[i]['id']);
										var content = '<td>' + img + name + '</td>';
										content += '<td>' + self.volumes[i]['size'] + ' GB</td>';
										content += '<td>';
										if (self.volumes[i]['status'] == 'in-use') {
											content += 'Attached';
										}
										else {
											content += 'Available';
										}
										content += '</td>';
										return content;
									}
								}));
							}
							vol_table.append(vol_tbody);
							self.$el.find('#volumes_'+self.identity_id).html(vol_table);
						}
						// FINALLY: Data-populated is true, show accordion body
						$(e.target).closest('.accordion-group').attr('data-populated', 'true');

						setTimeout(function() { 
							loader.remove();

							var children = self.$el.find('.accordion-inner .row-fluid');
							children.slideDown();

						}, 3000);
					},
					error: function() {
						errors.push("Could not load volumes for this cloud identity.");
						self.fail_volumes();

						$(e.target).closest('.accordion-group').attr('data-populated', 'true');

						setTimeout(function() { 
							loader.remove();

							var children = self.$el.find('.accordion-inner .row-fluid');
							children.slideDown();

						}, 3000);
					},
					dataType: 'json'
				});
				$(e.target).closest('.accordion-group').attr('data-populated', 'true');
			});
        }
        else {
            $(e.target).parent().parent().find('.accordion-body').collapse('toggle');
        }
    },
	fail_profile: function() {
		console.log("profile fail");
	},
	fail_instances: function() {
		console.log("instance fail");
		this.$el.find('#instances_'+this.identity_id).html('Could not load instances for this identity.');
	},
	fail_volumes: function() {
		console.log("volume fail");
		this.$el.find('#volumes_'+this.identity_id).html('Could not load volumes for this identity.');
	}
});