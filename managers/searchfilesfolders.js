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


const _appSystem = Shell.AppSystem.get_default();
const _createApp = _appSystem.lookup_desktop_wmclass;


const Gettext = imports.gettext.domain('menyy');
const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const shell_path     = Menyy.path + "/bash_scripts";
const cache_path     = Menyy.path + "/cache/";
const constants = Menyy.imports.constants;
const AppType = constants.AppType;


let UseSymbolicIcons = false;

const fileInfo = new Lang.Class({
	Name: 'terminalCommandInfo',

	_init: function(name, mime, thumb, path) {
		this.thumb = thumb;
		this.uri = path
		this.name = name;
		this.mime = mime;
		this.icon = Gio.content_type_get_icon(mime);
		this.appType = AppType.FILE;
	},
	_getFileName: function() {
		return this.name;
	},

	getIcon: function() {
		return Gio.content_type_get_icon(this.mime);
	}
});

const searchFilesManager = new Lang.Class({
	Name: 'searchFilesManager',

	_init: function(useSymbolic) {
		UseSymbolicIcons = useSymbolic;

		this._commands = [];
		this.homePath = GLib.get_home_dir();
	},
	
	// Loads right Click menu
	_loadFiles: function(location, pattern, amount) {
		this._files = [];
		// Shell script takes 3 inputs, location (homepath), search pattern and max amount of results (to speed things up)
		let argv = shell_path + "/searchFilesFolders.sh '" + location + "' '" + pattern + "' " + amount;
		let fileList;
		try {
			fileList = GLib.spawn_command_line_sync(argv);
        } catch (err) {
            if (err.code == GLib.SpawnError.G_SPAWN_ERROR_NOENT) {
                err.message = _("Menyy: Command not found");
            } else {
                err.message = "menyy: " + err.message.replace(/.*\((.+)\)/, '$1');
            }

            throw err;
        }
        // Make the commandline result to string and then to list. List elements in string are separated by new lines
        fileList = fileList[1].toString().split("\n");
        for (let id = 0; id < fileList.length; id++) {
        	// if not empty line (because it could happen)
        	if (fileList[id] != ""){
        		// name is after the last slash in a file
        		const name = fileList[id].substring(fileList[id].lastIndexOf('/')+1);
        		// file path needs to add file:// and replace the first character with homepath (if it's a dot for some reason?)
        		const path = "file://" + (fileList[id]).replace(/^./, this.homePath);
        		// thumbnail path is separate, because it needs to replace (most) special characters, but the thumbnail path couldn't be used to copy files
        		const thumbnailPath = "file://" + (encodeURIComponent(fileList[id]).replace(/%2F/gi, "/")).replace(/^./, this.homePath);
        		// mimetype is guessed from filename, not checked
        		const mime = Gio.content_type_guess('filename=' + name, null)[0];
        		// just adds new file
        		this._files.push(new fileInfo (name, mime, thumbnailPath, path) );
        	}
        }
        // get rif of filelist, as it's no longer used
		fileList = null;
		// send a filelist update
		this.emit('filelist-updated');
	},
	
	getFiles: function (location, pattern, amount) {
		this._loadFiles(location, pattern, amount);
		return this._files;
	}
	
});
Signals.addSignalMethods(searchFilesManager.prototype);
