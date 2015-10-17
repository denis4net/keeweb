'use strict';

var Backbone = require('backbone'),
    IconMap = require('../../const/icon-map');

var DetailsIconView = Backbone.View.extend({
    template: require('templates/details/details-icon.html'),

    events: {
        'click .details__icons-icon': 'iconClick'
    },

    render: function() {
        this.renderTemplate({
            sel: this.model.iconId,
            icons: IconMap
        }, true);
        return this;
    },

    iconClick: function(e) {
        var iconId = +$(e.target).data('val');
        if (typeof iconId === 'number' && !isNaN(iconId)) {
            this.trigger('select', iconId);
        }
    }
});

module.exports = DetailsIconView;
