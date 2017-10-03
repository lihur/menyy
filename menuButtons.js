const Lang = imports.lang;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;								//apps menu item arc
const Clutter = imports.gi.Clutter;									//apps menu item arc
const DND = imports.ui.dnd;											//apps menu item arc
const Shell = imports.gi.Shell;										//AppsListButton
const GLib = imports.gi.GLib;										//Places & UserMenuItem
const AccountsService = imports.gi.AccountsService;					//UserMenuItem
const Util = imports.misc.util;										//UserMenuItem
const Gio = imports.gi.Gio;											//UserMenuItem


// Put in settings!
const CATEGORY_ICON_SIZE = 32;
const APPLICATION_ICON_SIZE = 32;
const USER_ICON_SIZE = 64;

// DELETEME!
const ApplicationType = {
	    APPLICATION: 0,
	    PLACE: 1,
	    RECENT: 2
	};








/* =========================================================================
/* name:    CategoryListButton
 * @desc    A button with an icon and label that holds app info
 * From GnoMenu project
 * ========================================================================= */
const CategoryListButton = new Lang.Class({
    Name: 'Menyy.CategoryListButton',

    _init: function (dir, altNameText, altIconName) {
        this.buttonEnterCallback = null;
        this.buttonLeaveCallback = null;
        this.buttonPressCallback = null;
        this.buttonReleaseCallback = null;
        this._ignoreHoverSelect = null;

        let style = "popup-menu-item popup-submenu-menu-item menyy-category-button";
        this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });
        this.actor._delegate = this;
        this.buttonbox = new St.BoxLayout();
        let iconSize = CATEGORY_ICON_SIZE;

        this._dir = dir;
        let categoryNameText = "";
        let categoryIconName = null;

        if (typeof dir == 'string') {
            categoryNameText = altNameText;
            categoryIconName = altIconName;
        } else {
            categoryNameText = dir.get_name() ? dir.get_name() : "";
            categoryIconName = dir.get_icon() ? dir.get_icon().get_names().toString() : "error";
        }
        /*
        if (this._userIcon) {
            let iconFileName = this._user.get_icon_file();
            let iconFile = Gio.file_new_for_path(iconFileName);
            setIconAsync(this._userIcon, iconFile, 'avatar-default');
        }
        */
        if (categoryIconName) {
        	//let iconFileName = categoryIconName;
        	//let iconFile = Gio.file_new_for_path(iconFileName);
            this.icon = new St.Icon({icon_name: categoryIconName, icon_size: iconSize});
            //setIconAsync(this.icon, iconFile, 'applications-other');
            this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
        }
        this.label = new St.Label({ text: categoryNameText, style_class: 'menyy-category-button-label' });
        this.buttonbox.add(this.label, {x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});

        this.actor.set_child(this.buttonbox);

        // Connect signals
        this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));
    },

    setButtonEnterCallback: function(cb) {
        this.buttonEnterCallback = cb;
        this.actor.connect('enter-event', Lang.bind(this, this.buttonEnterCallback));
    },

    setButtonLeaveCallback: function(cb) {
        this.buttonLeaveCallback = cb;
        this.actor.connect('leave-event', Lang.bind(this, this.buttonLeaveCallback));
    },

    setButtonPressCallback: function(cb) {
        this.buttonPressCallback = cb;
        this.actor.connect('button-press-event', Lang.bind(this, this.buttonPressCallback));
    },

    setButtonReleaseCallback: function(cb) {
        this.buttonReleaseCallback = cb;
        this.actor.connect('button-release-event', Lang.bind(this, this.buttonReleaseCallback));
    },

    select: function() {
        this._ignoreHoverSelect = true;
        this.buttonEnterCallback.call();
    },

    unSelect: function() {
        this._ignoreHoverSelect = false;
        this.buttonLeaveCallback.call();
    },

    click: function() {
        this.buttonPressCallback.call();
        this.buttonReleaseCallback.call();
    },
    
    _onTouchEvent : function (actor, event) {
        return Clutter.EVENT_PROPAGATE;
    }
    
});


/* =========================================================================
/* name:    AppListButton
 * @desc    A button with an icon and label that holds app info for various
 * @desc    types of sources (application, places, recent)
 * From GnoMenu project
 * ========================================================================= */

const AppListButton = new Lang.Class({
    Name: 'Menyy.AppListButton',

    _init: function (app, appType) {
        this._app = app;
        this._type = appType;
        this._stateChangedId = 0;
        let style = "popup-menu-item gnomenu-application-list-button";
        this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.MIDDLE});
        this.actor._delegate = this;
        this._iconSize = APPLICATION_ICON_SIZE;
        //this._iconSize = (settings.get_int('apps-list-icon-size') > 0) ? settings.get_int('apps-list-icon-size') : 28;

        // appType 0 = application, appType 1 = place, appType 2 = recent
        if (appType == ApplicationType.APPLICATION) {
            this.icon = app.create_icon_texture(this._iconSize);
            this.label = new St.Label({ text: app.get_name(), style_class: 'gnomenu-application-list-button-label' });
        } else if (appType == ApplicationType.PLACE) {
            this.icon = new St.Icon({gicon: app.icon, icon_size: this._iconSize});
            if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
            this.label = new St.Label({ text: app.name, style_class: 'gnomenu-application-list-button-label' });
        } else if (appType == ApplicationType.RECENT) {
            let gicon = Gio.content_type_get_icon(app.mime);
            this.icon = new St.Icon({gicon: gicon, icon_size: this._iconSize});
            if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
            this.label = new St.Label({ text: app.name, style_class: 'gnomenu-application-list-button-label' });
        }
        
        this._dot = new St.Widget({ style_class: 'app-well-app-running-dot',
                                    layout_manager: new Clutter.BinLayout(),
                                    x_expand: true, y_expand: true,
                                    x_align: Clutter.ActorAlign.CENTER,
                                    y_align: Clutter.ActorAlign.END });

        this._iconContainer = new St.BoxLayout({vertical: true});
        this._iconContainer.add_style_class_name('gnomenu-application-list-button-icon');

        this._iconContainer.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.END, y_align: St.Align.END});
        this._iconContainer.add(this._dot, {x_fill: false, y_fill: false, x_align: St.Align.END, y_align: St.Align.END});

        this.buttonbox = new St.BoxLayout();
        this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
        this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});

        this.actor.set_child(this.buttonbox);

        // Connect signals
        this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));
        if (appType == ApplicationType.APPLICATION) {
            this._stateChangedId = this._app.connect('notify::state', Lang.bind(this, this._onStateChanged));
        }

        // Connect drag-n-drop signals
        this._draggable = DND.makeDraggable(this.actor);
        this._draggable.connect('drag-begin', Lang.bind(this,
            function () {
                //this._removeMenuTimeout();
                Main.overview.beginItemDrag(this);
                if (GnoMenu.appsMenuButton) {
                    if (GnoMenu.appsMenuButton._categoryWorkspaceMode == CategoryWorkspaceMode.CATEGORY)
                        GnoMenu.appsMenuButton.toggleCategoryWorkspaceMode();
                }
            }));
        this._draggable.connect('drag-cancelled', Lang.bind(this,
            function () {
                Main.overview.cancelledItemDrag(this);
            }));
        this._draggable.connect('drag-end', Lang.bind(this,
            function () {
               Main.overview.endItemDrag(this);
            }));

        // Check if running state
        this._dot.opacity = 0;
        this._onStateChanged();
    },

    _onTouchEvent : function (actor, event) {
        return Clutter.EVENT_PROPAGATE;
    },

    _onStateChanged: function() {
        if (this._type == ApplicationType.APPLICATION) {
            if (this._app.state != Shell.AppState.STOPPED) {
                this._dot.opacity = 255;
            } else {
                this._dot.opacity = 0;
            }
        }
    },

    getDragActor: function() {
        let appIcon;
        if (this._type == ApplicationType.APPLICATION) {
            appIcon = this._app.create_icon_texture(this._iconSize);
        } else if (this._type == ApplicationType.PLACE) {
            appIcon = new St.Icon({gicon: this._app.icon, icon_size: this._iconSize});
        } else if (this._type == ApplicationType.RECENT) {
            let gicon = Gio.content_type_get_icon(this._app.mime);
            appIcon = new St.Icon({gicon: gicon, icon_size: this._iconSize});
        }
        return appIcon;
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource: function() {
        return this.icon;
    },

    shellWorkspaceLaunch : function(params) {
        params = Params.parse(params, { workspace: -1,
                                        timestamp: 0 });

        if (this._type == ApplicationType.APPLICATION) {
            this._app.open_new_window(params.workspace);
        } else if (this._type == ApplicationType.PLACE) {
           if (this._app.uri) {
               this._app.app.launch_uris([this._app.uri], null);
           } else {
               this._app.launch();
           }
        } else if (this._type == ApplicationType.RECENT) {
            Gio.app_info_launch_default_for_uri(this._app.uri, global.create_app_launch_context(0, -1));
        }

        this.actor.remove_style_pseudo_class('pressed');
        this.actor.remove_style_class_name('selected');

        if (GnoMenu.appsMenuButton) {
            if (GnoMenu.appsMenuButton.menu.isOpen)
                GnoMenu.appsMenuButton.menu.toggle();
        }
    }
});


/* =========================================================================
/* name:    AppGridButton
 * @desc    A button with an icon and label that holds app info for various
 * @desc    types of sources (application, places, recent)
 * ========================================================================= */

const AppGridButton = new Lang.Class({
    Name: 'GnoMenu.AppGridButton',

    _init: function(app, appType, includeText) {
        this._app = app;
        this._type = appType;
        this._stateChangedId = 0;
        let styleButton = "popup-menu-item gnomenu-application-grid-button";

        let styleLabel = "gnomenu-application-grid-button-label";
        
        //DELETEME!
        styleButton += ".col3"
        /*
        if (settings.get_int('apps-grid-column-count') == 3) {
            styleButton += " col3";
        } else if (settings.get_int('apps-grid-column-count') == 4) {
            styleButton += " col4";
        } else if (settings.get_int('apps-grid-column-count') == 5) {
            styleButton += " col5";
        } else if (settings.get_int('apps-grid-column-count') == 6) {
            styleButton += " col6";
        } else if (settings.get_int('apps-grid-column-count') == 7) {
            styleButton += " col7";
        }
        */
        
        /*
        if (settings.get_boolean('hide-categories')) {
            styleButton += " no-categories";
            styleLabel += " no-categories";
        }
        */

        this.actor = new St.Button({reactive: true, style_class: styleButton, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
        this.actor._delegate = this;
        /*
        this._iconSize = (settings.get_int('apps-grid-icon-size') > 0) ? settings.get_int('apps-grid-icon-size') : 64;
        */
        this._iconSize = 64;

        // appType 0 = application, appType 1 = place, appType 2 = recent
        if (appType == ApplicationType.APPLICATION) {
            this.icon = app.create_icon_texture(this._iconSize);
            this.label = new St.Label({ text: app.get_name(), style_class: styleLabel });
        } else if (appType == ApplicationType.PLACE) {
            this.icon = new St.Icon({gicon: app.icon, icon_size: this._iconSize});
            if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
            this.label = new St.Label({ text: app.name, style_class: styleLabel });
        } else if (appType == ApplicationType.RECENT) {
            let gicon = Gio.content_type_get_icon(app.mime);
            this.icon = new St.Icon({gicon: gicon, icon_size: this._iconSize});
            if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
            this.label = new St.Label({ text: app.name, style_class: styleLabel });
        }

        this._dot = new St.Widget({ style_class: 'app-well-app-running-dot',
                                    layout_manager: new Clutter.BinLayout(),
                                    x_expand: true, y_expand: true,
                                    x_align: Clutter.ActorAlign.CENTER,
                                    y_align: Clutter.ActorAlign.END });

        this.buttonbox = new St.BoxLayout({vertical: true});
        this.buttonbox.add(this.icon, {x_fill: false, y_fill: false,x_align: St.Align.MIDDLE, y_align: St.Align.START});
        if(includeText){
            // Use pango to wrap label text
            //this.label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
            //this.label.clutter_text.line_wrap = true;
            this.buttonbox.add(this.label, {x_fill: false, y_fill: true,x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
        }
        this.buttonbox.add(this._dot, {x_fill: false, y_fill: false,x_align: St.Align.MIDDLE, y_align: St.Align.START});
        this.actor.set_child(this.buttonbox);

        // Connect signals
        this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));
        if (appType == ApplicationType.APPLICATION) {
            this._stateChangedId = this._app.connect('notify::state', Lang.bind(this, this._onStateChanged));
        }

        // Connect drag-n-drop signals
        this._draggable = DND.makeDraggable(this.actor);
        this._draggable.connect('drag-begin', Lang.bind(this,
            function () {
                //this._removeMenuTimeout();
                Main.overview.beginItemDrag(this);
                if (GnoMenu.appsMenuButton) {
                    if (GnoMenu.appsMenuButton._categoryWorkspaceMode == CategoryWorkspaceMode.CATEGORY)
                        GnoMenu.appsMenuButton.toggleCategoryWorkspaceMode();
                }
            }));
        this._draggable.connect('drag-cancelled', Lang.bind(this,
            function () {
                Main.overview.cancelledItemDrag(this);
            }));
        this._draggable.connect('drag-end', Lang.bind(this,
            function () {
               Main.overview.endItemDrag(this);
            }));

        // Check if running state
        this._dot.opacity = 0;
        this._onStateChanged();
    },

    _onTouchEvent : function (actor, event) {
        return Clutter.EVENT_PROPAGATE;
    },

    _onStateChanged: function() {
        if (this._type == ApplicationType.APPLICATION) {
            if (this._app.state != Shell.AppState.STOPPED) {
                this._dot.opacity = 255;
            } else {
                this._dot.opacity = 0;
            }
        }
    },

    getDragActor: function() {
        let appIcon;
        if (this._type == ApplicationType.APPLICATION) {
            appIcon = this._app.create_icon_texture(this._iconSize);
        } else if (this._type == ApplicationType.PLACE) {
            appIcon = new St.Icon({gicon: this._app.icon, icon_size: this._iconSize});
        } else if (this._type == ApplicationType.RECENT) {
            let gicon = Gio.content_type_get_icon(this._app.mime);
            appIcon = new St.Icon({gicon: gicon, icon_size: this._iconSize});
        }
        return appIcon;
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource: function() {
        return this.icon;
    },

    shellWorkspaceLaunch : function(params) {
        params = Params.parse(params, { workspace: -1,
                                        timestamp: 0 });

        if (this._type == ApplicationType.APPLICATION) {
            this._app.open_new_window(params.workspace);
        } else if (this._type == ApplicationType.PLACE) {
           if (this._app.uri) {
               this._app.app.launch_uris([this._app.uri], null);
           } else {
               this._app.launch();
           }
        } else if (this._type == ApplicationType.RECENT) {
            Gio.app_info_launch_default_for_uri(this._app.uri, global.create_app_launch_context(0, -1));
        }

        this.actor.remove_style_pseudo_class('pressed');
        this.actor.remove_style_class_name('selected');

        if (GnoMenu.appsMenuButton) {
            if (GnoMenu.appsMenuButton.menu.isOpen)
                GnoMenu.appsMenuButton.menu.toggle();
        }
    }
});





/* =========================================================================
/* name:    ShortcutButton
 * @desc    A button with an icon that holds app info
 * ========================================================================= */

const ShortcutButton = new Lang.Class({
    Name: 'GnoMenu.ShortcutButton',

    _init: function (app, appType) {
        this._app = app;
        this._type = appType;
        let style = "popup-menu-item menyy-shortcut-button";
        this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });
        this.actor._delegate = this;
        //this._iconSize = (settings.get_int('shortcuts-icon-size') > 0) ? settings.get_int('shortcuts-icon-size') : 32;
        this._iconSize = 16;

        // appType 0 = application, appType 1 = place, appType 2 = recent
        if (appType == ApplicationType.APPLICATION) {
            this.icon = app.create_icon_texture(this._iconSize);
            this.label = new St.Label({ text: app.get_name(), style_class: 'menyy-application-grid-button-label' });
        } else if (appType == ApplicationType.PLACE) {
            // Adjust 'places' symbolic icons by reducing their size
            // and setting a special class for button padding
            this._iconSize -= 4;
            this.actor.add_style_class_name('menyy-shortcut-symbolic-button');
            this.icon = new St.Icon({gicon: app.icon, icon_size: this._iconSize, style_class: 'menyy-shortcut-icon'});
            if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
            this.label = new St.Label({ text: app.name, style_class: 'menyy-shortcut-label' });
        } else if (appType == ApplicationType.RECENT) {
            let gicon = Gio.content_type_get_icon(app.mime);
            this.icon = new St.Icon({gicon: gicon, icon_size: this._iconSize, style_class: 'menyy-shortcut-icon'});
            if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
            this.label = new St.Label({ text: app.name, style_class: 'menyy-shortcut-label' });
        }
        //this.label = new St.Label({ text: app.get_name(), style_class: 'gnomenu-shortcut-button-label' });

        this.buttonbox = new St.BoxLayout();
        this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
        this.buttonbox.add(this.label, {x_fill: false, y_fill: true, x_align: St.Align.START, y_align: St.Align.MIDDLE});

        this.actor.set_child(this.buttonbox);

        // Connect signals
        this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));

        // Connect drag-n-drop signals
        this._draggable = DND.makeDraggable(this.actor);
        this._draggable.connect('drag-begin', Lang.bind(this,
            function () {
                //this._removeMenuTimeout();
                Main.overview.beginItemDrag(this);
                if (GnoMenu.appsMenuButton) {
                    if (GnoMenu.appsMenuButton._categoryWorkspaceMode == CategoryWorkspaceMode.CATEGORY)
                        GnoMenu.appsMenuButton.toggleCategoryWorkspaceMode();
                }
            }));
        this._draggable.connect('drag-cancelled', Lang.bind(this,
            function () {
                Main.overview.cancelledItemDrag(this);
            }));
        this._draggable.connect('drag-end', Lang.bind(this,
            function () {
               Main.overview.endItemDrag(this);
            }));
    },

    _onTouchEvent : function (actor, event) {
        return Clutter.EVENT_PROPAGATE;
    },

    getDragActor: function() {
        let appIcon;
        if (this._type == ApplicationType.APPLICATION) {
            appIcon = this._app.create_icon_texture(this._iconSize);
        } else if (this._type == ApplicationType.PLACE) {
            appIcon = new St.Icon({gicon: this._app.icon, icon_size: this._iconSize});
        } else if (this._type == ApplicationType.RECENT) {
            let gicon = Gio.content_type_get_icon(this._app.mime);
            appIcon = new St.Icon({gicon: gicon, icon_size: this._iconSize});
        }
        return appIcon;
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource: function() {
        return this.icon;
    },

    shellWorkspaceLaunch : function(params) {
        params = Params.parse(params, { workspace: -1,
                                        timestamp: 0 });

        if (this._type == ApplicationType.APPLICATION) {
            this._app.open_new_window(params.workspace);
        } else if (this._type == ApplicationType.PLACE) {
           if (this._app.uri) {
               this._app.app.launch_uris([this._app.uri], null);
           } else {
               this._app.launch();
           }
        } else if (this._type == ApplicationType.RECENT) {
            Gio.app_info_launch_default_for_uri(this._app.uri, global.create_app_launch_context(0, -1));
        }

        this.actor.remove_style_pseudo_class('pressed');
        this.actor.remove_style_class_name('selected');

        if (GnoMenu.appsMenuButton) {
            if (GnoMenu.appsMenuButton.menu.isOpen)
                GnoMenu.appsMenuButton.menu.toggle();
        }
    }
});












































































//DELETEME!
//Removing the default behaviour which selects a hovered item if the space key is pressed.
//This avoids issues when searching for an app with a space character in its name.
const BaseMenuItem = new Lang.Class({
Name: 'BaseMenuItem',
Extends: PopupMenu.PopupBaseMenuItem,
_onKeyPressEvent: function (actor, event) {
 let symbol = event.get_key_symbol();

 if (symbol == Clutter.KEY_Return) {
     this.activate(event);
     return Clutter.EVENT_STOP;
 }
 return Clutter.EVENT_PROPAGATE;
}
});

/*
//User Home directories
const DEFAULT_DIRECTORIES = [
    GLib.UserDirectory.DIRECTORY_DOCUMENTS,
    GLib.UserDirectory.DIRECTORY_DOWNLOAD,
    GLib.UserDirectory.DIRECTORY_MUSIC,
    GLib.UserDirectory.DIRECTORY_PICTURES,
    GLib.UserDirectory.DIRECTORY_VIDEOS,	
];
*/



//Menu Category item class ARCMENU
const CategoryMenuItem = new Lang.Class({
    Name: 'CategoryMenuItem',
    Extends: BaseMenuItem,

    // Initialize menu item
    _init: function(button, category) {
	    this.parent();
	    this._category = category;
        this._button = button;
        let name;
        if (this._category)
            name = this._category.get_name();
        //else
        //    name = _("Favorites");

        this._icon = new St.Icon({ gicon: this._category.get_icon(),
                                   style_class: 'menyy-popup-menu-icon',
                                   icon_size: APPLICATION_ICON_SIZE});
        this.actor.add_child(this._icon);
        let categoryLabel = new St.Label({style_class: 'menyy-popup-menu-label', text: name, y_expand: true,
                                      y_align: Clutter.ActorAlign.CENTER });
        this.actor.add_child(categoryLabel, { expand: true });
        this.actor.label_actor = categoryLabel;
        //let themeNode = this.actor.get_theme_node();
        //this.actor.set_style('padding-left: 0px; border-left: 0px; -natural-hpadding: 0px; -minimum-hpadding: 0px; margin-left: 0px; background-color: #0000ff;');
        
    },

    // Activate menu item (Display applications in category)
    activate: function(event) {
        this._button._selectCategory(this._category);
	      this.parent(event);
    },

    // Set button as active, scroll to the button
    setActive: function(active, params) {
        //if (active && !this.actor.hover)
        //    this._button.scrollToButton(this);

        this.parent(active, params);
    }
});



//arcmenu
//Menu Place Shortcut item class

const PlaceMenuItem = new Lang.Class({
    Name: 'PlaceMenuItem',
    Extends: BaseMenuItem,

    // Initialize menu item
    _init: function(button, info) {
	    this.parent();
	    this._button = button;
	    this._info = info;
        this._icon = new St.Icon({ gicon: info.icon,
                                   icon_size: 16 });
	    this.actor.add_child(this._icon);
        this._label = new St.Label({ text: info.name, y_expand: true,
                                      y_align: Clutter.ActorAlign.CENTER });
        this.actor.add_child(this._label, { expand: true });
        this._changedId = this._info.connect('changed',
                                       Lang.bind(this, this._propertiesChanged));
    },

    // Destroy menu item
    destroy: function() {
        if (this._changedId) {
            this._info.disconnect(this._changedId);
            this._changedId = 0;
        }
        this.parent();
    },

    // Activate (launch) the shortcut
    activate: function(event) {
	    this._info.launch(event.get_time());
      this._button.menu.toggle();
	    this.parent(event);
    },

    // Handle changes in place info (redisplay new info)
    _propertiesChanged: function(info) {
        this._icon.gicon = info.icon;
        this._label.text = info.name;
    },
});


// Menu Application Item from ArcMenu
const ApplicationMenuItem = new Lang.Class({
    Name: 'ApplicationMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    // Initialize menu item
    _init: function(button, app) {
	    this.parent();
	    this._app = app;
        this.app = app;
        this._button = button;
        this._iconBin = new St.Bin();
        this.actor.add_child(this._iconBin);

        let appLabel = new St.Label({style_class: "menyy-appLabel", text: app.get_name(), y_expand: true,
                                      y_align: Clutter.ActorAlign.CENTER });
        this.actor.add_child(appLabel, { expand: true });
        this.actor.label_actor = appLabel;

        let textureCache = St.TextureCache.get_default();
        let iconThemeChangedId = textureCache.connect('icon-theme-changed',
                                                      Lang.bind(this, this._updateIcon));
        this.actor.connect('destroy', Lang.bind(this,
            function() {
                textureCache.disconnect(iconThemeChangedId);
            }));
        this.actor.connect('popup-menu', Lang.bind(this, this._onKeyboardPopupMenu));
        this._updateIcon();
        this._menu = null;
        this._menuManager = new PopupMenu.PopupMenuManager(this);
        this._menuTimeoutId = 0;

        this._draggable = DND.makeDraggable(this.actor);
        this.isDraggableApp = true;
        this._draggable.connect('drag-begin', Lang.bind(this,
            function () {
                this._removeMenuTimeout();
                Main.overview.beginItemDrag(this);
            }));
        this._draggable.connect('drag-cancelled', Lang.bind(this,
            function () {
                Main.overview.cancelledItemDrag(this);
            }));
        this._draggable.connect('drag-end', Lang.bind(this,
            function () {
                Main.overview.endItemDrag(this);
            }));
    },

    get_app_id: function() {
        return this._app.get_id();
    },

    getDragActor: function() {
       return this._app.create_icon_texture(APPLICATION_ICON_SIZE);
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource: function() {
        return this.actor;
    },

    // Activate menu item (Launch application)
    activate: function(event) {
        this._app.open_new_window(-1);
        this._button.menu.toggle();
        this.parent(event);
    },

    // Set button as active, scroll to the button
    setActive: function(active, params) {
        if (active && !this.actor.hover)
            this._button.scrollToButton(this);

        this.parent(active, params);
    },

    // Update the app icon in the menu
    _updateIcon: function() {
        this._iconBin.set_child(this._app.create_icon_texture(APPLICATION_ICON_SIZE));
    },

    _removeMenuTimeout: function() {
        if (this._menuTimeoutId > 0) {
            Mainloop.source_remove(this._menuTimeoutId);
            this._menuTimeoutId = 0;
        }
    },

    _setPopupTimeout: function() {
        this._removeMenuTimeout();
        this._menuTimeoutId = Mainloop.timeout_add(AppDisplay.MENU_POPUP_TIMEOUT,
            Lang.bind(this, function() {
                this._menuTimeoutId = 0;
                this.popupMenu();
                return GLib.SOURCE_REMOVE;
            }));
        GLib.Source.set_name_by_id(this._menuTimeoutId, '[gnome-shell] this.popupMenu');
    },

    _onLeaveEvent: function(actor, event) {
        this._removeMenuTimeout();
    },

    popupMenu: function() {
        this._removeMenuTimeout();

        if (this._draggable)
            this._draggable.fakeRelease();

        if (!this._menu) {
            this._menu = new SecondaryMenu.AppItemMenu(this);;
            this._menu.connect('activate-window', Lang.bind(this, function (menu, window) {
                this.activateWindow(window);
            }));
            this._menu.connect('open-state-changed', Lang.bind(this, function (menu, isPoppedUp) {
                if (!isPoppedUp)
                    this._onMenuPoppedDown();
            }));
            let id = Main.overview.connect('hiding', Lang.bind(this, function () { this._menu.close(); }));
            this.actor.connect('destroy', function() {
                Main.overview.disconnect(id);
            });

            this._menuManager.addMenu(this._menu);
        }

        this.emit('menu-state-changed', true);

        this.actor.set_hover(true);
        this._menu.popup();
        this._menuManager.ignoreRelease();

        return false;
    },
    
    _onMenuPoppedDown: function() {
        this.actor.sync_hover();
        this.emit('menu-state-changed', false);
    },

    _onKeyboardPopupMenu: function() {
        this.popupMenu();
        this._menu.actor.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
    },

    _onButtonPressEvent: function(actor, event) {
        this.actor.add_style_pseudo_class ('active');
        let button = event.get_button();
        if (button == 1) {
            this._setPopupTimeout();
        } else if (button == 3) {
            this.popupMenu();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    },

    _onButtonReleaseEvent: function (actor, event) {
        this._removeMenuTimeout();
        this.actor.remove_style_pseudo_class ('active');
        let button = event.get_button();
        if (button != 3) {
            this.activate(event);
        }
        return Clutter.EVENT_STOP;
    },

    _onTouchEvent: function (actor, event) {
        if (event.type() == Clutter.EventType.TOUCH_BEGIN)
            this._setPopupTimeout();

        return Clutter.EVENT_PROPAGATE;
    },

    _onDestroy: function() {
        this.parent();
        this._removeMenuTimeout();
    }
});



/*
//Menu shortcut item class
const ShortcutMenuItem = new Lang.Class({
 Name: 'ShortcutMenuItem',
 Extends: BaseMenuItem,

 // Initialize the menu item
 _init: function(button, name, icon, command) {
	      this.parent();
     this._button = button;
     this._command = command;
     this._icon = new St.Icon({ icon_name: icon,
                                style_class: 'popup-menu-icon',
                                icon_size: 16});
     this.actor.add_child(this._icon);
     let label = new St.Label({ text: name, y_expand: true,
                                   y_align: Clutter.ActorAlign.CENTER });
     this.actor.add_child(label, { expand: true });
 },

 // Activate the menu item (Launch the shortcut)
 activate: function(event) {
     Util.spawnCommandLine(this._command);
     this._button.menu.toggle();
	    this.parent(event);
 }
});
*/



//Menu item to go back to category view (for arcmenu compatibility)
const BackMenuItem = new Lang.Class({
    Name: 'BackMenuItem',
    Extends: BaseMenuItem,

    // Initialize the button
    _init: function(button) {
	    this.parent();
        this._button = button;

        this._icon = new St.Icon({ icon_name: 'go-previous-symbolic',
                                   style_class: 'popup-menu-icon',
                                   icon_size: APPLICATION_ICON_SIZE});
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({ text: _("Back"), y_expand: true,
                                      y_align: Clutter.ActorAlign.CENTER });
        this.actor.add_child(backLabel, { expand: true });
    },

    // Activate the button (go back to category view)
    activate: function(event) {
        this._button._selectCategory(null);
        if (this._button.searchActive) this._button.resetSearch();
	    this.parent(event);
    },
});



// MOVE ELSEWHERE!
//Sets icon asynchronously (user icon)
function setIconAsync(icon, gioFile, fallback_icon_name) {
	  gioFile.load_contents_async(null, function(source, result) {
	    try {
	      let bytes = source.load_contents_finish(result)[1];
	      icon.gicon = Gio.BytesIcon.new(bytes);
	    }
	    catch(err) {
	      icon.icon_name = fallback_icon_name;
	    }
	  });
	}


//Menu item which displays the current user
const UserMenuItem = new Lang.Class({
 Name: 'UserMenuItem',
 Extends: BaseMenuItem,

 // Initialize the menu item
 _init: function(button) {
	    this.parent();
     this._button = button;
     let username = GLib.get_user_name();
     this._user = AccountsService.UserManager.get_default().get_user(username);
     this._userIcon = new St.Icon({ style_class: 'popup-menu-icon',
                                icon_size: USER_ICON_SIZE});
     this.actor.add_child(this._userIcon);
     this._userLabel = new St.Label({ text: username, 
                                      y_expand: true,
                                      //font size changing?
                                      y_align: Clutter.ActorAlign.CENTER, 
                                   });
     this.actor.add_child(this._userLabel, { expand: true });
     this._userLoadedId = this._user.connect('notify::is_loaded', Lang.bind(this, this._onUserChanged));
     this._userChangedId = this._user.connect('changed', Lang.bind(this, this._onUserChanged));
     this.actor.connect('destroy', Lang.bind(this, this._onDestroy));
     this._onUserChanged();
 },

 // Activate the menu item (Open user account settings)
 activate: function(event) {
     Util.spawnCommandLine("gnome-control-center user-accounts");
     this._button.menu.toggle();
	    this.parent(event);
 },

 // Handle changes to user information (redisplay new info)
 _onUserChanged: function() {
     if (this._user.is_loaded) {
         this._userLabel.set_text (this._user.get_real_name());
         if (this._userIcon) {
             let iconFileName = this._user.get_icon_file();
             let iconFile = Gio.file_new_for_path(iconFileName);
             setIconAsync(this._userIcon, iconFile, 'avatar-default');
         }
     }
 },

 // Destroy the menu item
 _onDestroy: function() {
     if (this._userLoadedId != 0) {
         this._user.disconnect(this._userLoadedId);
         this._userLoadedId = 0;
     }

     if (this._userChangedId != 0) {
         this._user.disconnect(this._userChangedId);
         this._userChangedId = 0;
     }
 }
});