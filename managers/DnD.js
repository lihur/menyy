const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const DND = imports.ui.dnd;
const Gtk = imports.gi.Gtk;
const Clutter = imports.gi.Clutter;



const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const menuButtons = Menyy.imports.menuButtons;
const AppButton = menuButtons.AppButton;

const constants = Menyy.imports.constants;
const AppType = constants.AppType;
const cache_path = Menyy.path + "/cache/";


const DragTarget = new Lang.Class({
	Name: 'DragTarget',

	_init: function() {
		this._desktop = null;
		this._desktopDestroyedId = 0;

		this._targetList = [];
		this._targetsDestroyedId = [];
		
		
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

	get hasTarget() {
		return this._target != null;
	},

	_onWindowAdded: function(group, actor) {
		// remove open targets
		this._targetList = [];
		this._targetsDestroyedId = [];
		if (!(actor instanceof Meta.WindowActor))
			return;
		if (actor.meta_window.get_window_type() == Meta.WindowType.DESKTOP){
			this._setDesktop(actor);
		} else if (actor.meta_window.get_window_type() == Meta.WindowType.NORMAL) {
			//this._addTarget(actor);
		}
	},

	_setDesktop: function(desktop) {
		if (this._desktop) {
			this._desktop.disconnect(this._desktopDestroyedId);
			this._desktopDestroyedId = 0;

			delete this._desktop._delegate;
		}

		this._desktop = desktop;
		this.emit('target-changed');

		if (this._desktop) {
			this._desktopDestroyedId = this._desktop.connect('destroy', () => {
				this._setDesktop(null);
			});
			this._desktop._delegate = this;
		}
	},


	_addTarget: function(target) {
		this._targetsDestroyedId.push(0);
		this._targetList.push(target);
		this._setTargets(this._targetList);
	},
	
	_setTargets: function(targetList) {
		for (var ct in targetList) {
			let current = targetList[ct];
			if (current) {
				current.disconnect();
				this._targetsDestroyedId[ct] = 0;

				delete current._delegate;
			}

			this._targetList[ct] = current;
			this.emit('target-changed');

			if (current) {
				this._targetsDestroyedId[ct] = current.connect('destroy', () => {
					this._setTargets(null);
				});
				current._delegate = this;
			}
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
		//global.log("menyy dragged over " + global.get_stage().get_actor_at_pos(Clutter.PickMode.ALL, x,y).get_parent().get_parent().get_meta_window().get_wm_class());
		let appInfo = this._getSourceAppInfo(source);
		if (!appInfo)
			return DND.DragMotionResult.CONTINUE;

		return DND.DragMotionResult.COPY_DROP;
	},

	acceptDrop: function(source, actor, x, y, time) {
		// get drop target name and window type
		/*
		let name;
		let windowType;
		if (global.get_stage().get_actor_at_pos(Clutter.PickMode.ALL, x,y).get_parent().get_parent().get_meta_window() != null) {
			name = global.get_stage().get_actor_at_pos(Clutter.PickMode.ALL, x,y).get_parent().get_parent().get_meta_window().get_wm_class();
			windowType = global.get_stage().get_actor_at_pos(Clutter.PickMode.ALL, x,y).get_parent().get_parent().get_meta_window().get_window_type();
		} else {
			name = "-1";
			windowType = -1;
		}
		
		global.log("menyy name " + name);
		global.log("menyy windowType " + windowType);
		*/
		
		
		
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
				const contents =   "[Desktop Entry]\n" +
				"Name = Link to " + source.app.name + "\n" +
				"Comment = Automatically generated Web Shortcut\n" +
				"Type = Link\n" +
				"Icon = text-html\n" +
				"URL = " + source.app.uri + "\n" +
				"";
	
				if (!contents)
					return false;
				this.emit('app-dropped');
	
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