/* Instance views */
Atmo.Views.InstanceScreen = Backbone.View.extend({
	tagName: 'div',
	className: 'screen',
	id: 'instanceList',
	template: _.template(Atmo.Templates.instance_screen),
	alt_template: _.template(Atmo.Templates.instance_screen_alt),
	events: {
		'click .terminate_instance': 'terminate',
		'click #help_request_more_resources': 'show_request_resources_modal'
	},
	initialize: function(options) {
		Atmo.instances.bind('reset', this.render, this);
		Atmo.instances.bind('add', this.append_instance, this);
        Atmo.instances.bind('remove', this.remove_instance, this);
        Atmo.instances.bind('select', this.select_instance, this);
	},
	render: function() {
		if (Atmo.instances.models.length > 0) {

			if (this.$el.find('#resource_usage_holder').length == 0)
				this.$el.html(this.template());
			
			this.mem_resource_chart = new Atmo.Views.ResourceCharts({
				el: this.$el.find('#memHolder'),
				quota_type: 'mem'
			}).render();
			this.cpu_resource_chart = new Atmo.Views.ResourceCharts({
				el: this.$el.find('#cpuHolder'),
				quota_type: 'cpu'
			}).render();

			if (Atmo.instances.models.length > 0) {
				var self = this;
                
                /* performation optimization */
                var frag = document.createDocumentFragment();
				$.each(Atmo.instances.models, function(k, v) {
					frag.appendChild(self.new_instance_tabs_holder(v).el);
				});
                this.$el.append(frag);
			}

		} else {
			this.$el.html(this.alt_template());
		}

        // Assign content to the popovers
        this.$el.find('#help_resource_usage').popover({
            placement: 'bottom',
            title: 'My Resource Usage <a class="close" data-dismiss="popover" href="#instances" data-parent="help_resource_usage">&times</a>',
            html: true,
            content: function() {
                var content = 'Your "resource usage" is determined by how many CPUs and GB of memory your instances are using cumulatively. <br /><br />';
                content += 'You can re-use your resources only after you\'ve terminated an instance and it has disappeared from the "My Instances" list on the left.';
                return content;
            }
        }).click(_.bind(this.x_close, this));

		return this;
	},
    x_close: function() {
            // Must assign this function after the popover is actually rendered, so we find '.close' element
            $('.close').click(function(e) {
                e.preventDefault();
                var popover_parent = $(e.currentTarget).data('parent');
                if (popover_parent != undefined) {
                    $('#'+popover_parent).popover('hide');
                }            
            });
	},
	append_instance: function(model) {
		if (this.$el.find('#instance_holder').length == 0)
			this.render();
		else { 
            this.new_instance_tabs_holder(model).$el.appendTo(this.$el.find('#instance_holder'));
            this.cpu_resource_chart.render();
            this.mem_resource_chart.render();
        }
	},
    new_instance_tabs_holder: function(model) {
        var new_view = new Atmo.Views.InstanceTabsHolder({model: model}).render();
        new_view.$el.css('display', 'none');
        return new_view;
    },
    remove_instance: function(model) {
        this.$el.find('.instance_tabs_holder[data-instanceid="'+model.get('id')+'"]').remove();
        this.cpu_resource_chart.render();
        this.mem_resource_chart.render();
        if (Atmo.instances.isEmpty())
            this.$el.html(this.alt_template());
    },
	terminate: function(e) {
		Atmo.instances.selected_instance.confirm_terminate({
			success: function() {
				Atmo.instances.update();

				var header = "Instance Terminated";
				var body = "Your instance is shutting down.";
				Atmo.Utils.notify(header, body);

			},
			error: function(model, message) {
				//console.log('error');
				//console.log(model, message);
			}
		});
	},
	show_request_resources_modal: function() {
		Atmo.request_resources_modal.do_alert();
	}
});