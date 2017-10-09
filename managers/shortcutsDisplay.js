/* ========================================================================================================
 * placeDisplay.js - Places Manager for Gnome Shell 3.6
 * --------------------------------------------------------------------------------------------------------
 *  CREDITS:  This code was copied from the Places Status Indicator extension and modified to provide the
 *  functions needed by GnoMenu. Many thanks to gcampax for a great extension.
 * ========================================================================================================
 */


const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const St = imports.gi.St;

const DND = imports.ui.dnd;
const Main = imports.ui.main;
const Params = imports.misc.params;
const Search = imports.ui.search;
const Util = imports.misc.util;

const Gettext = imports.gettext.domain('menyy');
const _ = Gettext.gettext;
const N_ = function(x) { return x; }

const _appSystem = Shell.AppSystem.get_default();
const _foundApps = _appSystem.lookup_desktop_wmclass('nautilus');

const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const constants = Menyy.imports.constants;
const AppType = constants.AppType;



let UseSymbolicIcons = false;

const ShortcutInfo = new Lang.Class({
	Name: 'ShortcutInfo',

	_init: function(name, icon, command) {
		this.name = name;
		this.appType = AppType.SHORTCUT;
		this.icon = icon;
		this.command = command;
	},

	isRemovable: function() {
		return false;
	},

	launch: function(timestamp) {
		Util.spawnCommandLine(this.command);
	},

	getIcon: function() {
		if (UseSymbolicIcons)
			return Gio.content_type_get_icon(this.icon);
		else
			return Gio.content_type_get_icon(this.icon);
	}
});

// As list to concatenate later
// TODO(Check if needs to be list at all)
// Applications SOFTWARE
const APPLICATION_SOFTWARE = [
	{   label: _("Software"),
		symbolic: "org.gnome.Software-symbolic",
		command: "gnome-software" },
	{   label: _("Settings"),
		symbolic: "preferences-system-symbolic",
		command: "gnome-control-center" },
	{   label: _("Tweak Tool"),
		symbolic: "gnome-tweak-tool-symbolic",
		command: "gnome-tweak-tool" },
	{   label: _("Tweaks"),
		symbolic: "gnome-tweak-tool-symbolic",
		command: "gnome-tweaks" },
	{   label: _("Menu Editor (Alacarte)"),
		symbolic: "accessories-text-editor-symbolic",
		command: "alacarte" },
	{   label: _("Menu Editor (MenuLibre)"),
		symbolic: "accessories-dictionary-symbolic",
		command: "menulibre" },
	{   label: _("Menu Settings"),
		symbolic: "org.gnome.Books-symbolic",
		command: "gnome-shell-extension-prefs menyy@lihurp.gmail.com"
	}
];

const ShortcutsManager = new Lang.Class({
	Name: 'ShortcutsManager',

	_init: function(useSymbolic) {
		UseSymbolicIcons = useSymbolic;
		this._shortcuts = [];
		this._rightclick = [];
		this._bookmarkTimeoutId = 0;
		this._loadRightClick();		
	},
	
	// Loads right Click menu
	_loadRightClick: function() {
		this._rightclick = [];
		this._software = APPLICATION_SOFTWARE;
		
		(this._software).forEach(Lang.bind(this, function(shortcut) {
			// Check if command exists and if command has space, only the first part!
			if (GLib.find_program_in_path(shortcut.command.split(" ")[0])) {
				this._rightclick.push(new ShortcutInfo( shortcut.label, shortcut.symbolic, shortcut.command));
			}			
		}));
		this.emit('rightClick-updated');
	},
	
	
	// Loads applications
	_loadApplications: function() {
		this._shortcuts = [];
		this._software = APPLICATION_SOFTWARE;
		
		// Add all software
		(this.software).forEach(Lang.bind(this, function(shortcut) {
			// Check if command exists and if command has space, only the first part!
			if (GLib.find_program_in_path(shortcut.command.split(" ")[0])) {
				this._shortcuts.push(new ShortcutInfo( shortcut.label, shortcut.symbolic, shortcut.command));
			}
		}));
		this.emit('applications-updated');
	},
	
	// Application "places"
	getApplications: function () {
		return this._shortcuts;
	},
	
	// RIGHTCLICK
	getRightClickPlaces: function () {
		return this._rightclick;
	}
	
});
Signals.addSignalMethods(ShortcutsManager.prototype);
