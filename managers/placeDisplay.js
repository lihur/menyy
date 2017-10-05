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



let UseSymbolicIcons = false;

const PlaceInfo = new Lang.Class({
	Name: 'PlaceInfo',

	_init: function(kind, file, name, icon) {
		//this.app = app || _foundApps;
		this.kind = kind;
		this.file = file;
		// this.name = name || this._getFileName();
		this.name = name ? name : this._getFileName();
		this.icon = icon ? new Gio.ThemedIcon({ name: icon }) : this.getIcon();
	},

	isRemovable: function() {
		return false;
	},

	launch: function(timestamp) {
		// let time = global.get_current_time();
		let launchContext = global.create_app_launch_context(0, -1);
		launchContext.set_timestamp(timestamp);

		try {
			Gio.AppInfo.launch_default_for_uri(this.file.get_uri(),
					launchContext);
		} catch(e if e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_MOUNTED)) {
			this.file.mount_enclosing_volume(0, null, null, function(file, result) {
				file.mount_enclosing_volume_finish(result);
				Gio.AppInfo.launch_default_for_uri(file.get_uri(), launchContext);
			});
		} catch(e) {
			Main.notifyError(_("Failed to launch \"%s\"").format(this.name), e.message);
		}
	},

	getIcon: function() {
		try {
			let info;
			if (UseSymbolicIcons) {
				info = this.file.query_info('standard::symbolic-icon', 0, null);
				return info.get_symbolic_icon();
			} else {
				info = this.file.query_info("standard::icon", 0, null);
				return info.get_icon();
			}
		} catch(e if e instanceof Gio.IOErrorEnum) {
			// return a generic icon for this kind
			switch (this.kind) {
				case 'network':
					return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
				case 'devices':
					return new Gio.ThemedIcon({ name: 'drive-harddisk-symbolic' });
				case 'special':
				case 'bookmarks':
				default:
					if (!this.file.is_native())
						return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
					else
						return new Gio.ThemedIcon({ name: 'folder-symbolic' });
			}
		}
	},

	_getFileName: function() {
		try {
			let info = this.file.query_info('standard::display-name', 0, null);
			return info.get_display_name();
		} catch(e if e instanceof Gio.IOErrorEnum) {
			return this.file.get_basename();
		}
	},
});

// Devices Places Info Class
const PlaceDeviceInfo = new Lang.Class({
	Name: 'PlaceDeviceInfo',
	Extends: PlaceInfo,

	_init: function(kind, mount) {
		this._mount = mount;
		this.parent(kind, mount.get_root(), mount.get_name());
	},

	getIcon: function() {
		if (UseSymbolicIcons)
			return this._mount.get_symbolic_icon();
		else
			return this._mount.get_icon();

	}
});

// Apps Places Info Class
const PlaceAppInfo = new Lang.Class({
	Name: 'PlaceAppInfo',
	Extends: PlaceInfo,
	
	//(kind, file, name, icon)
	_init: function(kind, command, label, icon) {
		this._icon = icon;
		this._command = command;
		this.parent(kind, command, label);
	},
	
	// Launch Application separate
	launch: function(timestamp) {
		Util.spawnCommandLine(this._command);
	},

	getIcon: function() {
		if (UseSymbolicIcons)
			//return this._command.get_symbolic_icon();
			return Gio.content_type_get_icon(this._icon);
		else
			//return this._mount.get_icon();
			return Gio.content_type_get_icon(this._icon);
	}
});




const DEFAULT_DIRECTORIES = [
	 GLib.UserDirectory.DIRECTORY_DOCUMENTS,
	 GLib.UserDirectory.DIRECTORY_DOWNLOAD,
	 GLib.UserDirectory.DIRECTORY_MUSIC,
	 GLib.UserDirectory.DIRECTORY_PICTURES,
	 GLib.UserDirectory.DIRECTORY_VIDEOS
                             ];


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


const PlacesManager = new Lang.Class({
	Name: 'PlacesManager',

	_init: function(useSymbolic) {
		UseSymbolicIcons = useSymbolic;

		this._places = {
				special: [],
				devices: [],
				bookmarks: [],
				network: [],
				rightClick: [],
				applications: [],
		};

		let homePath = GLib.get_home_dir();

		this._places.special.push(new PlaceInfo('special',
				Gio.File.new_for_path(homePath),
				_("Home")));


		for (let i = 0; i < DEFAULT_DIRECTORIES.length; i++) {
			let specialPath = GLib.get_user_special_dir(DEFAULT_DIRECTORIES[i]);
			if (specialPath) {
				if (specialPath == homePath)
					continue;
				this._places.special.push(new PlaceInfo('special',
						Gio.File.new_for_path(specialPath)));
			}
		}
		
		/*
		 * Show devices, code more or less ported from nautilus-places-sidebar.c
		 */
		this._volumeMonitor = Gio.VolumeMonitor.get();
		this._connectVolumeMonitorSignals();
		this._updateMounts();

		this._bookmarksFile = this._findBookmarksFile();
		//global.log("menyy -> this._bookmarksFile: + " + this._bookmarksFile);
		
		this._bookmarkTimeoutId = 0;
		this._monitor = null;

		if (this._bookmarksFile) {
			this._monitor = this._bookmarksFile.monitor_file(Gio.FileMonitorFlags.NONE, null);
			this._monitor.connect('changed', Lang.bind(this, function () {
				if (this._bookmarkTimeoutId > 0)
					return;
				/* Defensive event compression */
				this._bookmarkTimeoutId = Mainloop.timeout_add(100, Lang.bind(this, function () {
					this._bookmarkTimeoutId = 0;
					this._reloadBookmarks();
					return false;
				}));
			}));
			this._reloadBookmarks();
		}
		
		
		
		this._loadRightClick();
		
		
		//global.log("menyy -> places -> bookmarks: " + this._places['special']);
	},
	
	// Loads right Click menu
	// TODO(ADD SETTINGS TO CONTROL WHAT TO LOAD)
	_loadRightClick: function() {
		this._rightClick = APPLICATION_SOFTWARE;
		this._hasMenuEditor = false;
		this._places.bookmarks = [];
		
		
		
		(this._rightClick).forEach(Lang.bind(this, function(shortcut) {
			// Check if command exists and if command has space, only the first part!
			if (GLib.find_program_in_path(shortcut.command.split(" ")[0])) {
				this._places.rightClick.push(new PlaceAppInfo('rightClick', shortcut.command,  shortcut.label, shortcut.symbolic));
			}			
		}));
		this.emit('rightClick-updated');
	},
	
	
	// Loads applications as places
	// TODO(ADD SETTINGS TO CONTROL WHAT TO LOAD)
	// TODO(ADD SETTINGS TO ALLOW CUSTOM APPLICATIONS)
	_loadApplications: function() {
		this._software = APPLICATION_SOFTWARE;
		this._places.bookmarks = [];
		
		// Add all software
		(this.software).forEach(Lang.bind(this, function(shortcut) {
			// Check if command exists and if command has space, only the first part!
			if (GLib.find_program_in_path(shortcut.command.split(" ")[0])) {
				this._places.applications.push(new PlaceAppInfo('applications', shortcut.command,  shortcut.label, shortcut.symbolic));
			}
		}));
		this.emit('applications-updated');
	},
	
	
	

	_connectVolumeMonitorSignals: function() {
		const signals = ['volume-added', 'volume-removed', 'volume-changed',
		                 'mount-added', 'mount-removed', 'mount-changed',
		                 'drive-connected', 'drive-disconnected', 'drive-changed'];

		this._volumeMonitorSignals = [];
		let func = Lang.bind(this, this._updateMounts);
		for (let i = 0; i < signals.length; i++) {
			let id = this._volumeMonitor.connect(signals[i], func);
			this._volumeMonitorSignals.push(id);
		}
	},

	destroy: function() {
		for (let i = 0; i < this._volumeMonitorSignals.length; i++)
			this._volumeMonitor.disconnect(this._volumeMonitorSignals[i]);

		if (this._monitor)
			this._monitor.cancel();
		if (this._bookmarkTimeoutId)
			Mainloop.source_remove(this._bookmarkTimeoutId);
	},

	_updateMounts: function() {
		this._places.devices = [];
		this._places.network = [];

		/* Add standard places */
		let symbolic = "";
		if (UseSymbolicIcons) {
			symbolic = "-symbolic";
		}
		this._places.devices.push(new PlaceInfo('devices',
				Gio.File.new_for_path('/'),
				_("Computer"),
				'drive-harddisk'+symbolic));
		this._places.network.push(new PlaceInfo('network',
				Gio.File.new_for_uri('network:///'),
				_("Browse network"),
				'network-workgroup'+symbolic));


		/* first go through all connected drives */
		let drives = this._volumeMonitor.get_connected_drives();
		for (let i = 0; i < drives.length; i++) {
			let volumes = drives[i].get_volumes();

			for(let j = 0; j < volumes.length; j++) {
				let mount = volumes[j].get_mount();
				let kind = 'devices';
				let identifier = volumes[j].get_identifier('class');
				if (identifier && identifier.indexOf('network') >= 0)
					kind = 'network';

				if(mount != null)
					this._addMount(kind, mount);
			}
		}


		/* add all volumes that is not associated with a drive */
		let volumes = this._volumeMonitor.get_volumes();
		for(let i = 0; i < volumes.length; i++) {
			if(volumes[i].get_drive() != null)
				continue;

			let kind = 'devices';
			let identifier = volumes[i].get_identifier('class');
			if (identifier && identifier.indexOf('network') >= 0)
				kind = 'network';

			let mount = volumes[i].get_mount();
			if(mount != null)
				this._addMount(kind, mount);
		}


		/* add mounts that have no volume (/etc/mtab mounts, ftp, sftp,...) */
		let mounts = this._volumeMonitor.get_mounts();
		for(let i = 0; i < mounts.length; i++) {
			if(mounts[i].is_shadowed())
				continue;

			if(mounts[i].get_volume())
				continue;

			let root = mounts[i].get_default_location();
			let kind;
			if (root.is_native())
				kind = 'devices';
			else
				kind = 'network';

			this._addMount(kind, mounts[i]);
		}


		this.emit('devices-updated');
		this.emit('network-updated');
	},

	_findBookmarksFile: function() {
		let paths = [
		             GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-3.0', 'bookmarks']),
		             GLib.build_filenamev([GLib.get_home_dir(), '.gtk-bookmarks']),
		             ];

		for (let i = 0; i < paths.length; i++) {
			if (GLib.file_test(paths[i], GLib.FileTest.EXISTS)) {
				return Gio.File.new_for_path(paths[i]);
			}
		}

		return null;
	},

	_reloadBookmarks: function() {
		this._bookmarks = [];

		let content = Shell.get_file_contents_utf8_sync(this._bookmarksFile.get_path());
		let lines = content.split('\n');

		let bookmarks = [];
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			let components = line.split(' ');
			let bookmark = components[0];

			if (!bookmark)
				continue;

			let file = Gio.File.new_for_uri(bookmark);
			if (file.is_native() && !file.query_exists(null))
				continue;

			let duplicate = false;
			for (let i = 0; i < this._places.special.length; i++) {
				if (file.equal(this._places.special[i].file)) {
					//global.log("menyy -> duplicate bookmark: " + bookmark);
					duplicate = true;
					break;
				}
			}
			if (duplicate)
				continue;
			for (let i = 0; i < bookmarks.length; i++) {
				if (file.equal(bookmarks[i].file)) {
					duplicate = true;
					break;
				}
			}
			if (duplicate)
				continue;

			let label = null;
			if (components.length > 1)
				label = components.slice(1).join(' ');
			//global.log("menyy -> push bookmark: " + bookmark);
			bookmarks.push(new PlaceInfo('bookmarks', file, label));
		}

		this._places.bookmarks = bookmarks;
		
		/*
		global.log("menyy: ------------------------------------------------------------");
		for (var i in bookmarks){
			global.log("menyy -> bookmarksList: " + bookmarks[i].name);
		}
		global.log("menyy: ------------------------------------------------------------");
		for (var i in this._places.bookmarks){
			global.log("menyy -> bookmarksFinal: " + this._places.bookmarks[i].name);
		}
		global.log("menyy: ------------------------------------------------------------");
		
		*/
		this.emit('bookmarks-updated');
	},

	_addMount: function(kind, mount) {
		let devItem = new PlaceDeviceInfo(kind, mount);
		this._places[kind].push(devItem);
	},

	getPlace: function (kind) {
		return this._places[kind];
	},

	getAllPlaces: function() {
		return this._places['special'].concat(this._places['bookmarks'], this._places['devices']);
	},

	getDefaultPlaces: function() {
		return this._places['special'];
	},

	getBookmarks: function() {
		//because it asks before generated?
		this._reloadBookmarks();
		return this._places['bookmarks'];
	},

	getMounts: function() {
		return this._places['devices'];
	},

	// Application "places"
	getApplications: function () {
		return this._places['applications'];
	},
	
	// RIGHTCLICK
	getRightClickPlaces: function () {
		return this._places['rightClick'];
	}
	
});
Signals.addSignalMethods(PlacesManager.prototype);
