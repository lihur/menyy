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
//const _ = Gettext.gettext;





//const N_ = function(x) { return x; }

const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const shell_path     = Menyy.path + "/bash_scripts";

let UseSymbolicIcons = false;

const terminalCommandInfo = new Lang.Class({
	Name: 'terminalCommandInfo',

	_init: function(command, location, mime, variables, app) {
		this.app = app;
		this.command = command;
		this.location = location;
		this.name = command + " " + variables;
		this.mime = mime;
		this.variables = variables;
		this.icon = Gio.content_type_get_icon(mime);
	},
	
	launch: function(timestamp) {
		let launchContext = global.create_app_launch_context(0, -1);
		launchContext.set_timestamp(timestamp);

		try {
			//Gio.AppInfo.launch_default_for_uri(this.location, launchContext);
			//Util.spawnCommandLine(this.command);
			Util.spawnCommandLine(this.command + " " + this.variables);
		} catch(e) {
			Main.notifyError(_("Failed to launch \"%s\"").format(this.name), e.message);
		}
	},
	_getFileName: function() {
		return this.name;
	},
	
	get_executable: function() {
		return this.command;
	},

	getIcon: function() {
		return Gio.content_type_get_icon(this.mime);	//definately works
	}
});

const CommandLineManager = new Lang.Class({
	Name: 'CommandLineManager',

	_init: function(useSymbolic) {
		UseSymbolicIcons = useSymbolic;

		this._commands = [];
		this._getMethods(Shell.AppSystem.search);
		//this.thingHere = Gio.AppInfo.create_from_commandline("eduke32", null, null);
		//global.log("menyy this thing here: " + this.thingHere);
		//+ Gio.AppInfo.Get_all_for_type
		//+ Gio.AppInfo.Get_default_for_type
		//+ Gio.AppInfo.create_from_commandline
		//Gio.DesktopAppInfo
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
	// TODO(ADD SETTINGS TO CONTROL WHAT TO LOAD)
	_loadCommands: function(pattern) {
		// pattern is the terminal command and variables are its inputs
		let variables;
		if(pattern.indexOf(' ') !== -1){
			variables = pattern.substr(pattern.indexOf(' ')+1);
		} else {
			variables = "";
		}
		pattern = pattern.split(" ")[0];
		
		global.log("menyy variables " + variables);
		
		this._commands = [];
		let argv = shell_path + "/listAllCommands.sh " + pattern + " 10";
		let commandsList;
		let commandInfo;
		try {
			commandsList = GLib.spawn_command_line_sync(argv);
        } catch (err) {
            if (err.code == GLib.SpawnError.G_SPAWN_ERROR_NOENT) {
                err.message = _("Command not found");
            } else {
                err.message = err.message.replace(/.*\((.+)\)/, '$1');
            }

            throw err;
        }
        commandsList = commandsList[1].toString().split("\n");
        for (let id = 0; id < commandsList.length; id++) {
        	if (commandsList[id] != ""){
	        	argv = shell_path + "/locateCommand.sh " + commandsList[id];
	    		try {
	    			commandInfo = GLib.spawn_command_line_sync(argv);
	            } catch (err) {
	                if (err.code == GLib.SpawnError.G_SPAWN_ERROR_NOENT) {
	                    err.message = _("Command not found");
	                } else {
	                    err.message = err.message.replace(/.*\((.+)\)/, '$1');
	                }
	                throw err;
	            }
	            commandInfo = commandInfo[1].toString().split("\n");
	            global.log("menyy terminal app: " );
	            this._commands.push(new terminalCommandInfo (commandsList[id], commandInfo[0], commandInfo[1], variables));
        	}
        }
		argv = null;
		commandsList = null;
		commandInfo = null;
		
		this.emit('rightClick-updated');
	},
	
	getCommands: function (pattern) {
		this._loadCommands(pattern);
		return this._commands;
	}
	
});
Signals.addSignalMethods(CommandLineManager.prototype);
