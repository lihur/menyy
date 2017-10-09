const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const DND = imports.ui.dnd;

const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const menuButtons = Menyy.imports.menuButtons;
const AppButton = menuButtons.AppButton;

const constants = Menyy.imports.constants;
const AppType = constants.AppType;
const cache_path = Menyy.path + "/cache/";


const DesktopTarget = new Lang.Class({
	Name: 'DesktopTarget',

	_init: function() {
		this._desktop = null;
		this._desktopDestroyedId = 0;

		this._windowAddedId =
			global.window_group.connect('actor-added',
					Lang.bind(this, this._onWindowAdded));

		global.get_window_actors().forEach(a => {
			this._onWindowAdded(a.get_parent(), a);
		});
	},

	get hasDesktop() {
		return this._desktop != null;
	},

	_onWindowAdded: function(group, actor) {
		if (!(actor instanceof Meta.WindowActor))
			return;

		if (actor.meta_window.get_window_type() == Meta.WindowType.DESKTOP)
			this._setDesktop(actor);
	},

	_setDesktop: function(desktop) {
		if (this._desktop) {
			this._desktop.disconnect(this._desktopDestroyedId);
			this._desktopDestroyedId = 0;

			delete this._desktop._delegate;
		}

		this._desktop = desktop;
		this.emit('desktop-changed');

		if (this._desktop) {
			this._desktopDestroyedId = this._desktop.connect('destroy', () => {
				this._setDesktop(null);
			});
			this._desktop._delegate = this;
		}
	},

	_getSourceAppInfo: function(source) {
		if (!(source instanceof AppButton)) {
			return null;
		} else {
			if (source._type == AppType.APPLICATION) {
				return source.app.app_info;
			} else {
				return null;
			}
		}
	},
	
	_getSourceFileInfo: function(source) {
		if (!(source instanceof AppButton)) {
			return null;
		} else {
			if (source._type == AppType.FILE) {
				return source.app.uri.replace('file://','');
			} else {
				return null;
			}
		}
	},

	_touchFile: function(file) {
		let queryFlags = Gio.FileQueryInfoFlags.NONE;
		let ioPriority = GLib.PRIORITY_DEFAULT;

		let info = new Gio.FileInfo();
		info.set_attribute_uint64(Gio.FILE_ATTRIBUTE_TIME_ACCESS,
				GLib.get_real_time());
		file.set_attributes_async (info, queryFlags, ioPriority, null,
				(o, res) => {
					try {
						o.set_attributes_finish(res);
					} catch(e) {
						log('Failed to update access time: ' + e.message);
					}
				});
	},

	_markTrusted: function(file) {
		let modeAttr = Gio.FILE_ATTRIBUTE_UNIX_MODE;
		let trustedAttr = 'metadata::trusted';
		let queryFlags = Gio.FileQueryInfoFlags.NONE;
		let ioPriority = GLib.PRIORITY_DEFAULT;

		file.query_info_async(modeAttr, queryFlags, ioPriority, null,
				(o, res) => {
					try {
						let info = o.query_info_finish(res);
						//Octals are deprecated
						//let mode = info.get_attribute_uint32(modeAttr) | 0100;
						let mode = info.get_attribute_uint32(modeAttr) | 0o100;

						info.set_attribute_uint32(modeAttr, mode);
						info.set_attribute_string(trustedAttr, 'yes');
						file.set_attributes_async (info, queryFlags, ioPriority, null,
								(o, res) => {
									o.set_attributes_finish(res);

									// Hack: force nautilus to reload file info
									this._touchFile(file);
								});
					} catch(e) {
						log('Failed to mark file as trusted: ' + e.message);
					}
				});
	},

	destroy: function() {
		if (this._windowAddedId)
			global.window_group.disconnect(this._windowAddedId);
		this._windowAddedId = 0;

		this._setDesktop(null);
	},

	handleDragOver: function(source, actor, x, y, time) {
		let appInfo = this._getSourceAppInfo(source);
		if (!appInfo)
			return DND.DragMotionResult.CONTINUE;

		return DND.DragMotionResult.COPY_DROP;
	},	

	acceptDrop: function(source, actor, x, y, time) {
		if (source._type == AppType.APPLICATION) {
			let appInfo = this._getSourceAppInfo(source);
			if (!appInfo)
				return false;
	
			this.emit('app-dropped');
	
			let desktop = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
	
			let src = Gio.File.new_for_path(appInfo.get_filename());
			let dst = Gio.File.new_for_path(GLib.build_filenamev([desktop, src.get_basename()]));
	
			try {
				// copy_async() isn't introspectable :-(
				src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
				this._markTrusted(dst);
			} catch(e) {
				log('Failed to copy to desktop: ' + e.message);
			}
		} else if (source._type == AppType.FILE) {
			let fileUri = this._getSourceFileInfo(source);
			if (!fileUri)
				return false;
			this.emit('app-dropped');
			let desktop = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
			
			let src = Gio.file_new_for_path(fileUri);
			let dst = Gio.File.new_for_path(GLib.build_filenamev([desktop, source.app.uri.replace(/^.*[\\\/]/, '')]));
			try {
				// copy_async() isn't introspectable :-(
				src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
				this._markTrusted(dst);
			} catch(e) {
				log('Failed to copy to desktop: ' + e.message);
			}
		} else if (source._type == AppType.FOLDER) {
			//let fileUri = this._getSourceFileInfo(source);
			let fileUri = source.app.uri.replace('file://','');
			if (!fileUri)
				return false;
			this.emit('app-dropped');
			let desktop = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
			//let src = Gio.file_new_for_path(fileUri);
			let dst = Gio.File.new_for_path(GLib.build_filenamev([desktop, source.app.uri.replace(/^.*[\\\/]/, '')]));	
			try {
				dst.make_symbolic_link(fileUri,  null);
			} catch(e) {
				log('Failed to copy to desktop: ' + e.message);
			}
		} else if (source._type == AppType.PLACE) {
			let fileUri = source.app.file.get_path();
			if (!fileUri)
				return false;
			this.emit('app-dropped');
			let desktop = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
			let dst = Gio.File.new_for_path(GLib.build_filenamev([desktop, source.app.file.get_basename()]));	
			try {
				dst.make_symbolic_link(fileUri,  null);
			} catch(e) {
				log('Failed to copy to desktop: ' + e.message);
			}
		} else if (source._type == AppType.WEBBOOKMARK) {
			global.log("menyy webbookmark uri: " + source.app.uri);
			const contents =   "[Desktop Entry]\n" +
			  "Name = Link to " + source.app.name + "\n" +
			  "Comment = Automatically generated Web Shortcut\n" +
			  "Type = Link\n" +
			  "Icon = text-html\n" +
			  "URL = " + source.app.uri + "\n" +
			  "";
			let desktop = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
			let file = Gio.File.new_for_path(GLib.build_filenamev([desktop, source.app.name + ".desktop"]));
			try {
				{
		            if (file.query_exists (null)) {
		            	file.delete(null);
		            }
		            let dos = file.create(Gio.FileCreateFlags.NONE, null);
		            dos.write(contents, null, contents.length);
		            this._markTrusted(file);
				} // Streams closed at this point
	        } catch (e) {
	        	Main.notifyError(_("Failed to create file \"%s\"").format(this.name), e.message);
	        }
		} else if (source._type == AppType.TERMINAL) {
			let fileUri = cache_path + source.app.app.get_id();
			if (!fileUri)
				return false;
			this.emit('app-dropped');
			let desktop = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
			
			let src = Gio.file_new_for_path(fileUri);
			let dst = Gio.File.new_for_path(GLib.build_filenamev([desktop, src.get_basename()]));
			try {
				// copy_async() isn't introspectable :-(
				src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
				this._markTrusted(dst);
			} catch(e) {
				log('Failed to copy to desktop: ' + e.message);
			}
		}

		return true;
	}
});