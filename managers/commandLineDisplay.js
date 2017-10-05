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
		this.appType = AppType.TERMINAL;
	},
	
	launch: function(timestamp) {
		let launchContext = global.create_app_launch_context(0, -1);
		launchContext.set_timestamp(timestamp);

		try {
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
		return Gio.content_type_get_icon(this.mime);
	}
});

const CommandLineManager = new Lang.Class({
	Name: 'CommandLineManager',

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
	
	createDesktopFile: function(filename, contents) {
		try {
			let file = Gio.file_new_for_path(cache_path + filename + ".desktop");
			
			{
	            // Test for the existence of file
	            if (file.query_exists (null)) {
	            	// If file exists, delete it (something's probably wrong then)
	            	file.delete(null);
	            }
	            //let fstream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
	            let dos = file.create(Gio.FileCreateFlags.NONE, null);
	            dos.write(contents, null, contents.length);
			} // Streams closed at this point
        } catch (e) {
        	Main.notifyError(_("Failed to create file \"%s\"").format(this.name), e.message);
        }
	},
	
	// Loads right Click menu
	// TODO(ADD SETTINGS TO CONTROL WHAT TO LOAD)
	_loadCommands: function(pattern, amount) {
		// pattern is the terminal command and variables are its inputs
		// TODO(DELETE THE CASH FOLDER (AS OPTION)
		
		let variables;
		if(pattern.indexOf(' ') !== -1){
			variables = pattern.substr(pattern.indexOf(' ')+1);
		} else {
			variables = "";
		}
		pattern = pattern.split(" ")[0];
		this._commands = [];
		let argv = shell_path + "/listAllCommands.sh " + pattern + " " + amount;
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
	            
	            
	            const name = commandsList[id];
	            const location = commandInfo[0];
	            const mimeType = commandInfo[1];
	            
	            
	            
	            // lets try and create from keyfile
	            const contents =   "[Desktop Entry]\n" +
	            					  "Name = " + name + "\n" +
	            					  "Comment = Automatically generated Terminal App\n" +
	            					  "Terminal = true\n" +
	            					  "Type = Application\n" +
	            					  "StartupNotify = True\n" +
	            					  //"Icon = terminal\n" +
	            					  "Categories = Other\n" +
	            					  "Exec = " + name + "\n" +
	            					  //"StartupWMClass = " + name;
	            					  "";
	            
	            

	            //TODO(CHECK IF DESKTOP FILE EXISTS)
	            let desktopAppInfo = Gio.DesktopAppInfo.new(name + ".desktop") || Gio.DesktopAppInfo.new_from_filename(cache_path + name + ".desktop");
	            if (desktopAppInfo == null) {
	            	this.createDesktopFile(name, contents);
	            	desktopAppInfo = Gio.DesktopAppInfo.new_from_filename(cache_path + name + ".desktop") || new Gio.DesktopAppInfo({filename: name});
	            }
	            const app = new Shell.App({ app_info: desktopAppInfo});
	            
	            this._commands.push(new terminalCommandInfo (name, location, mimeType, variables, app));
	            
	            
	            //global.log("menyy terminal app name: " + name);
	            //global.log("menyy terminal app wmclass: " + _appSystem.lookup_desktop_wmclass(name));
	            // takes a .desktop as input?
	            //global.log("menyy terminal app: " + _appSystem.lookup_app(name + '.desktop'));	            
	            
        	}
        }
		argv = null;
		commandsList = null;
		commandInfo = null;
		this.emit('rightClick-updated');
	},
	
	getCommands: function (pattern, amount) {
		this._loadCommands(pattern, amount);
		return this._commands;
	}
	
});
Signals.addSignalMethods(CommandLineManager.prototype);
