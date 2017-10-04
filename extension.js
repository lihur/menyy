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

//var settings_id = null;
var settings = null;
var button = null;
var menu_actor = null;
var timer_id = null;
var activitiesButton = null;



let menyy;
let appsMenuButton;
let settingsController;
let oldGetAppFromSource;

//Enable the extension
function enable() {
    settings = convenience.getSettings(Menyy.metadata['settings-schema']);
    menyy = new Menu.ApplicationsMenu(settings);

    // Create a Menu Controller that is responsible for controlling
    // and managing the menu as well as the menu button.
    settingsController = new controller.MenuSettingsController(settings, menyy);
    settingsController.enableButton();
    settingsController.bindSettingsChanges();
}


//Disable the extension
function disable() {
    settingsController.disableButton();
    settingsController.destroy();
    menyy.destroy();
    settings.run_dispose();

    settingsController =  null;
    settings = null;
    appsMenuButton = null;
    activitiesButton = null;
    Dash.getAppFromSource = oldGetAppFromSource;
    oldGetAppFromSource = null;
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