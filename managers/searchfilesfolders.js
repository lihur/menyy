/* ========================================================================================================
 * commandLineDisplay.js - Places Manager for Gnome Shell 3.6
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

	_init: function(name, mime, uri) {
		this.uri = uri;
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
	},
	
	_getMethods: function (obj) {
	    var res = [];
	    for(var m in obj) {
	        if(typeof obj[m] == "function") {
	            res.push(m)
	        }
	    }
	    //return res;
	    for (var i in res) {
	    	global.log("menyyproperties " + res[i]);
	    }
	},
	
	// Loads right Click menu
	_loadFiles: function(location, pattern, amount) {
		this._files = [];
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
        fileList = fileList[1].toString().split("\n");
        for (let id = 0; id < fileList.length; id++) {
        	if (fileList[id] != ""){
        		const name = fileList[id].substring(fileList[id].lastIndexOf('/')+1);
        		//const path = fileList[id].substring(0, fileList[id].lastIndexOf('/')+1);
        		const path = encodeURIComponent(fileList[id]).replace(/%2F/gi, "/");
        		const mime = Gio.content_type_guess('filename=' + name, null)[0];
        		this._files.push(new fileInfo (name, mime, "file://" + path));
        	}
        }
		fileList = null;
		this.emit('filelist-updated');
	},
	
	getFiles: function (location, pattern, amount) {
		this._loadFiles(location, pattern, amount);
		return this._files;
	}
	
});
Signals.addSignalMethods(searchFilesManager.prototype);
