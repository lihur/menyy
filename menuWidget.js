const Lang = imports.lang;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;


/**
 * This class is responsible for the appearance of the menu button.
 */
const MenuButtonWidget = new Lang.Class({
    Name: 'MenuButtonWidget',
    Extends: St.BoxLayout,

    _init: function() {
        this.parent({
            style_class: 'panel-status-menu-box',
            pack_start: false,
        });
        this._arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);
        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'popup-menu-icon'
        });
        this._label = new St.Label({
            text: _("Applications"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.add_child(this._icon);
        this.add_child(this._label);
        this.add_child(this._arrowIcon);
    },

    getPanelLabel: function() {
        return this._label;
    },

    getPanelIcon: function() {
        return this._icon;
    },

    showArrowIcon: function() {
        if (this.get_children().indexOf(this._arrowIcon) == -1) {
            this.add_child(this._arrowIcon);
        }
    },

    hideArrowIcon: function() {
        if (this.get_children().indexOf(this._arrowIcon) != -1) {
            this.remove_child(this._arrowIcon);
        }
    },

    showPanelIcon: function() {
        if (this.get_children().indexOf(this._icon) == -1) {
            this.add_child(this._icon);
        }
    },

    hidePanelIcon: function() {
        if (this.get_children().indexOf(this._icon) != -1) {
            this.remove_child(this._icon);
        }
    },

    showPanelText: function() {
        if (this.get_children().indexOf(this._label) == -1) {
            this.add_child(this._label);
        }
    },

    hidePanelText: function() {
        if (this.get_children().indexOf(this._label) != -1) {
            this.remove_child(this._label);
        }
    }
});
