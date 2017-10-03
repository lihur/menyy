const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils
const Mainloop = imports.mainloop;
const Gettext = imports.gettext;
const Dash = imports.ui.dash;	//what does it do?

// My Extension Files
const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const convenience = Menyy.imports.convenience;
const Menu = Menyy.imports.menu;
const controller = Menyy.imports.controller;




// Old ones
//const BaseMenuItem = menuButtons.BaseMenuItem;
//const ApplicationMenuItem = menuButtons.ApplicationMenuItem;
//const PlaceMenuItem = menuButtons.PlaceMenuItem;



//var settings_id = null;
var settings = null;
var button = null;
var menu_actor = null;
var timer_id = null;


//Menu Size variables
//const PLACES_ICON_SIZE = 16;
//const USER_ICON_SIZE = 64;
//const HORIZ_FACTOR = 5;
//const NAVIGATION_REGION_OVERSHOOT = 50;
//const MINIMUM_PADDING = 4;
//const viewMode = 0;

/*
function set_panel_display(button) {
    if (menu_actor) button.actor.remove_actor(menu_actor);

    if (settings.get_boolean("icon")) {
        let fpath = Gio.file_new_for_path(ExtensionUtils.getCurrentExtension().path +
                                          "/emblem-menu.png");
        let icon = new St.Icon({gicon: new Gio.FileIcon({file: fpath}),
                                style_class: "menyy-icon"});
        button.actor.add_actor(icon);
        menu_actor = icon;
    }
    else {
        let hbox = new St.BoxLayout({style_class: "panel-status-menu-box"});
        let fpath = Gio.file_new_for_path(ExtensionUtils.getCurrentExtension().path +
        "/emblem-menu.png");
        let icon = new St.Icon({gicon: new Gio.FileIcon({file: fpath}),
            style_class: "menyy-icon"});
        hbox.add_child(icon);
        hbox.add_child(new St.Label({text: Gettext.gettext("Menu"),
				     y_expand: true,
				     y_align: Clutter.ActorAlign.CENTER
				    }));
        button.actor.add_actor(hbox);
        menu_actor = hbox;
    }
}
*/





let menyy;
let appsMenuButton;
let settingsController;
//let oldGetAppFromSource;

//Enable the extension
function enable() {
    //settings = convenience.getSettings(Menyy.metadata['settings-schema']);
	settings = convenience.getSettings('org.gnome.shell.extensions.menyy');
    menyy = new Menu.ApplicationsMenu(settings);

    // Create a Menu Controller that is responsible for controlling
    // and managing the menu as well as the menu button.
    settingsController = new controller.MenuSettingsController(settings, menyy);
    settingsController.enableButton();
    settingsController.bindSettingsChanges();

    //oldGetAppFromSource = Dash.getAppFromSource;
    //Dash.getAppFromSource = getAppFromSource;
}


//Disable the extension
function disable() {
    settingsController.disableButton();
    settingsController.destroy();
    appsMenuButton.destroy();
    settings.run_dispose();

    settingsController =  null;
    settings = null;
    appsMenuButton = null;
    activitiesButton = null;
    //Dash.getAppFromSource = oldGetAppFromSource;
    //oldGetAppFromSource = null;
}

function getAppFromSource(source) {
    if (source instanceof AppDisplay.AppIcon) {
        return source.app;
    } else if (source instanceof Menu.ApplicationMenuItem) {
        return source._app;
    } else {
        return null;
    }
}

//Initialize menu language translations
function init(metadata) {
    //convenience.initTranslations();
}

/*
function enable() {
    timer_id = Mainloop.timeout_add(100, function () {
		timer_id = null;
		//settings = get_settings();
		settings = convenience.getSettings('org.gnome.shell.extensions.menyy');
		//button = new PanelMenu.Button(1.0);
		button = new ApplicationsMenu(settings);
		set_panel_display(button);
	
		
		//settings_id = global.settings.connect("changed::" + AppFavorites.getAppFavorites().FAVORITE_APPS_KEY,
		//				      function() {
		//					  button.menu.removeAll();
		//					  build_menu(button);
		//				      });
		//
	
		Main.panel.addToStatusArea("menyy", button, settings.get_int("position") - 1, "left");
		
	
		settings.connect("changed::icon", function () {
		    set_panel_display(button);
		});
		
		settings.connect("changed::position", function () {
		    let pos = settings.get_int("position") - 1;
		   
		    button.destroy();
		    button = new PanelMenu.Button(0.0);
		    set_panel_display(button);
		    build_menu(button);
		    Main.panel.addToStatusArea("menyy", button, pos, "left");
		});
		return false;
    });
}
*/

/*
function disable() {
    //if (settings_id) global.settings.disconnect(settings_id);
    if (timer_id) Mainloop.source_remove(timer_id);
    if (button) button.destroy();
    //settings_id = null;
    timer_id = null;
    settings = null;
    button = null;
    menu_actor = null;
}
*/

/*
function init() {
    let user_locale_path = ExtensionUtils.getCurrentExtension().path + "/locale";
    Gettext.bindtextdomain("menyy", user_locale_path);
    Gettext.textdomain("menyy");
}
*/