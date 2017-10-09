const Lang = imports.lang;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const DND = imports.ui.dnd;
const Shell = imports.gi.Shell;
const GLib = imports.gi.GLib;
const AccountsService = imports.gi.AccountsService;
const Util = imports.misc.util;
const Gio = imports.gi.Gio;
const AppDisplay = imports.ui.appDisplay;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Pango = imports.gi.Pango;



//My stuff
const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const RightClickMenus = Menyy.imports.rightClickMenu;
const convenience = Menyy.imports.convenience;
const settings = convenience.getSettings('org.gnome.shell.extensions.menyy');
const constants = Menyy.imports.constants;
const AppType = constants.AppType;
const ApplicationsViewMode = constants.ApplicationsViewMode;
const CategoriesViewMode = constants.CategoriesViewMode;
const SelectMethod = constants.SelectMethod;



//TODO(MOVE TO A HELPER FILE)
/*
 * _getMethods: function (obj) { var res = []; for(var m in obj) { if(typeof
 * obj[m] == "function") { res.push(m) } } //return res; for (var i in res) {
 * global.log("menyyproperties " + res[i]); } },
 */

//TODO(MOVE ELSEWHERE!)
//Sets icon asynchronously (user icon)
function setIconAsync(icon, gioFile, fallback_icon_name) {
	gioFile.load_contents_async(null, function(source, result) {
		try {
			let bytes = source.load_contents_finish(result)[1];
			icon.gicon = Gio.BytesIcon.new(bytes);
		}
		catch(err) {
		    icon.icon_name = fallback_icon_name;
		}
	});
}

//MOVE ELSEWHERE
function setThumbnailAsync(icon, gioFile, largeGioFile, fallback_icon_name, fallback_gicon) {
	gioFile.load_contents_async(null, function(source, result) {
		try {
			let bytes = source.load_contents_finish(result)[1];
			icon.gicon = Gio.BytesIcon.new(bytes);
		}
		catch(err) {
			largeGioFile.load_contents_async(null, function(source, result) {
				try {
					let bytes = source.load_contents_finish(result)[1];
					icon.gicon = Gio.BytesIcon.new(bytes);
				}
				catch(errr) {
					if (fallback_gicon) {
						icon.gicon = fallback_gicon;
					} else {
						icon.icon_name = fallback_icon_name;
					}
				}
			});
		}
	});
}

//MOVE ELSEWHERE
function generateMD5 (s) {
    function L(k, d) {
        return (k << d) | (k >>> (32 - d))
    }
    function K(G, k) {
        var I, d, F, H, x;
        F = (G & 2147483648);
        H = (k & 2147483648);
        I = (G & 1073741824);
        d = (k & 1073741824);
        x = (G & 1073741823) + (k & 1073741823);
        if (I & d) {
            return (x ^ 2147483648 ^ F ^ H)
        }
        if (I | d) {
            if (x & 1073741824) {
                return (x ^ 3221225472 ^ F ^ H)
            } else {
                return (x ^ 1073741824 ^ F ^ H)
            }
        } else {
            return (x ^ F ^ H)
        }
    }
    function r(d, F, k) {
        return (d & F) | ((~d) & k)
    }
    function q(d, F, k) {
        return (d & k) | (F & (~k))
    }
    function p(d, F, k) {
        return (d ^ F ^ k)
    }
    function n(d, F, k) {
        return (F ^ (d | (~k)))
    }
    function u(G, F, aa, Z, k, H, I) {
        G = K(G, K(K(r(F, aa, Z), k), I));
        return K(L(G, H), F)
    }
    function f(G, F, aa, Z, k, H, I) {
        G = K(G, K(K(q(F, aa, Z), k), I));
        return K(L(G, H), F)
    }
    function D(G, F, aa, Z, k, H, I) {
        G = K(G, K(K(p(F, aa, Z), k), I));
        return K(L(G, H), F)
    }
    function t(G, F, aa, Z, k, H, I) {
        G = K(G, K(K(n(F, aa, Z), k), I));
        return K(L(G, H), F)
    }
    function e(G) {
        var Z;
        var F = G.length;
        var x = F + 8;
        var k = (x - (x % 64)) / 64;
        var I = (k + 1) * 16;
        var aa = Array(I - 1);			//not undefined, is it?!
        var d = 0;
        var H = 0;
        while (H < F) {
            Z = (H - (H % 4)) / 4;
            d = (H % 4) * 8;
            aa[Z] = (aa[Z] | (G.charCodeAt(H) << d));
            H++
        }
        Z = (H - (H % 4)) / 4;
        d = (H % 4) * 8;
        aa[Z] = aa[Z] | (128 << d);
        aa[I - 2] = F << 3;
        aa[I - 1] = F >>> 29;
        return aa
    }
    function B(x) {
        var k = "",
            F = "",
            G, d;
        for (d = 0; d <= 3; d++) {
            G = (x >>> (d * 8)) & 255;
            F = "0" + G.toString(16);
            k = k + F.substr(F.length - 2, 2)
        }
        return k
    }
    function J(k) {
        k = k.replace(/rn/g, "n");
        var d = "";
        for (var F = 0; F < k.length; F++) {
            var x = k.charCodeAt(F);
            if (x < 128) {
                d += String.fromCharCode(x)
            } else {
                if ((x > 127) && (x < 2048)) {
                    d += String.fromCharCode((x >> 6) | 192);
                    d += String.fromCharCode((x & 63) | 128)
                } else {
                    d += String.fromCharCode((x >> 12) | 224);
                    d += String.fromCharCode(((x >> 6) & 63) | 128);
                    d += String.fromCharCode((x & 63) | 128)
                }
            }
        }
        return d
    }
    var C = Array();					//also not undefined!?
    var P, h, E, v, g, Y, X, W, V;
    var S = 7,
        Q = 12,
        N = 17,
        M = 22;
    var A = 5,
        z = 9,
        y = 14,
        w = 20;
    var o = 4,
        m = 11,
        l = 16,
        j = 23;
    var U = 6,
        T = 10,
        R = 15,
        O = 21;
    s = J(s);
    C = e(s);
    Y = 1732584193;
    X = 4023233417;
    W = 2562383102;
    V = 271733878;
    for (P = 0; P < C.length; P += 16) {
        h = Y;
        E = X;
        v = W;
        g = V;
        Y = u(Y, X, W, V, C[P + 0], S, 3614090360);
        V = u(V, Y, X, W, C[P + 1], Q, 3905402710);
        W = u(W, V, Y, X, C[P + 2], N, 606105819);
        X = u(X, W, V, Y, C[P + 3], M, 3250441966);
        Y = u(Y, X, W, V, C[P + 4], S, 4118548399);
        V = u(V, Y, X, W, C[P + 5], Q, 1200080426);
        W = u(W, V, Y, X, C[P + 6], N, 2821735955);
        X = u(X, W, V, Y, C[P + 7], M, 4249261313);
        Y = u(Y, X, W, V, C[P + 8], S, 1770035416);
        V = u(V, Y, X, W, C[P + 9], Q, 2336552879);
        W = u(W, V, Y, X, C[P + 10], N, 4294925233);
        X = u(X, W, V, Y, C[P + 11], M, 2304563134);
        Y = u(Y, X, W, V, C[P + 12], S, 1804603682);
        V = u(V, Y, X, W, C[P + 13], Q, 4254626195);
        W = u(W, V, Y, X, C[P + 14], N, 2792965006);
        X = u(X, W, V, Y, C[P + 15], M, 1236535329);
        Y = f(Y, X, W, V, C[P + 1], A, 4129170786);
        V = f(V, Y, X, W, C[P + 6], z, 3225465664);
        W = f(W, V, Y, X, C[P + 11], y, 643717713);
        X = f(X, W, V, Y, C[P + 0], w, 3921069994);
        Y = f(Y, X, W, V, C[P + 5], A, 3593408605);
        V = f(V, Y, X, W, C[P + 10], z, 38016083);
        W = f(W, V, Y, X, C[P + 15], y, 3634488961);
        X = f(X, W, V, Y, C[P + 4], w, 3889429448);
        Y = f(Y, X, W, V, C[P + 9], A, 568446438);
        V = f(V, Y, X, W, C[P + 14], z, 3275163606);
        W = f(W, V, Y, X, C[P + 3], y, 4107603335);
        X = f(X, W, V, Y, C[P + 8], w, 1163531501);
        Y = f(Y, X, W, V, C[P + 13], A, 2850285829);
        V = f(V, Y, X, W, C[P + 2], z, 4243563512);
        W = f(W, V, Y, X, C[P + 7], y, 1735328473);
        X = f(X, W, V, Y, C[P + 12], w, 2368359562);
        Y = D(Y, X, W, V, C[P + 5], o, 4294588738);
        V = D(V, Y, X, W, C[P + 8], m, 2272392833);
        W = D(W, V, Y, X, C[P + 11], l, 1839030562);
        X = D(X, W, V, Y, C[P + 14], j, 4259657740);
        Y = D(Y, X, W, V, C[P + 1], o, 2763975236);
        V = D(V, Y, X, W, C[P + 4], m, 1272893353);
        W = D(W, V, Y, X, C[P + 7], l, 4139469664);
        X = D(X, W, V, Y, C[P + 10], j, 3200236656);
        Y = D(Y, X, W, V, C[P + 13], o, 681279174);
        V = D(V, Y, X, W, C[P + 0], m, 3936430074);
        W = D(W, V, Y, X, C[P + 3], l, 3572445317);
        X = D(X, W, V, Y, C[P + 6], j, 76029189);
        Y = D(Y, X, W, V, C[P + 9], o, 3654602809);
        V = D(V, Y, X, W, C[P + 12], m, 3873151461);
        W = D(W, V, Y, X, C[P + 15], l, 530742520);
        X = D(X, W, V, Y, C[P + 2], j, 3299628645);
        Y = t(Y, X, W, V, C[P + 0], U, 4096336452);
        V = t(V, Y, X, W, C[P + 7], T, 1126891415);
        W = t(W, V, Y, X, C[P + 14], R, 2878612391);
        X = t(X, W, V, Y, C[P + 5], O, 4237533241);
        Y = t(Y, X, W, V, C[P + 12], U, 1700485571);
        V = t(V, Y, X, W, C[P + 3], T, 2399980690);
        W = t(W, V, Y, X, C[P + 10], R, 4293915773);
        X = t(X, W, V, Y, C[P + 1], O, 2240044497);
        Y = t(Y, X, W, V, C[P + 8], U, 1873313359);
        V = t(V, Y, X, W, C[P + 15], T, 4264355552);
        W = t(W, V, Y, X, C[P + 6], R, 2734768916);
        X = t(X, W, V, Y, C[P + 13], O, 1309151649);
        Y = t(Y, X, W, V, C[P + 4], U, 4149444226);
        V = t(V, Y, X, W, C[P + 11], T, 3174756917);
        W = t(W, V, Y, X, C[P + 2], R, 718787259);
        X = t(X, W, V, Y, C[P + 9], O, 3951481745);
        Y = K(Y, h);
        X = K(X, E);
        W = K(W, v);
        V = K(V, g)
    }
    var i = B(Y) + B(X) + B(W) + B(V);
    return i.toLowerCase()
};




const BaseMenuItem = new Lang.Class({
	Name: 'BaseMenuItem',
	Extends: PopupMenu.PopupBaseMenuItem,

	_onKeyPressEvent: function (actor, event) {
		let symbol = event.get_key_symbol();
		// global.log("menyy: basemenuitem keypress")

		if (symbol == Clutter.KEY_Return) {
			this.activate(event);
			return Clutter.EVENT_STOP;
		}
		return Clutter.EVENT_PROPAGATE;
	}
});


//	Menu item to launch GNOME activities overview
//	FROM ARCMENU
	const ActivitiesMenuItem = new Lang.Class({
		Name: 'ActivitiesMenuItem',
		Extends: BaseMenuItem,

		// Initialize the menu item
		_init: function(button) {
			this.parent();
			this._button = button;
			this._icon = new St.Icon({ icon_name: 'view-fullscreen-symbolic',
				style_class: 'popup-menu-icon',
				icon_size: 16});
			this.actor.add_child(this._icon);
			let label = new St.Label({ text: _("Activities Overview"), y_expand: true,
				y_align: Clutter.ActorAlign.CENTER });
			this.actor.add_child(label, { expand: true });
		},

		// Activate the menu item (Open activities overview)
		activate: function(event) {
			this._button.menu.toggle();
			Main.overview.toggle();
			this.parent(event);
		},
	});

	/*
	 * ========================================================================= /*
	 * name: UserMenuItem @desc A button with an icon and label that holds app info
	 * From GnoMenu project
	 * =========================================================================
	 */
	const UserMenuItem = new Lang.Class({
		Name: 'Menyy.UserMenuItem',

		// Initialize the menu item
		_init: function(menyy) {
			this.parent();
			//this._iconSize = (settings.get_int('user-icon-size') > 0) ? settings.get_int('user-icon-size') : 64;
			//this._showIcon = (settings.get_int('user-icon-size') > 0) ? true : false;
			this._iconSize = 64;
			this._showIcon = true;
			const userName = GLib.get_user_name();
			const realName = GLib.get_real_name();
			const hostName = GLib.get_host_name();

			this._user = AccountsService.UserManager.get_default().get_user(userName);
			this.label = new St.Label({ text: hostName, 
				y_expand: true,
				y_align: Clutter.ActorAlign.CENTER, 
			});

			let style = "popup-menu-item popup-submenu-menu-item menyy-user-button menyy-general-button";
			//this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });

			if (settings.get_enum('user-button-orientation') == 1) {
				this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.END, y_align: St.Align.START });
			} else if (settings.get_enum('user-button-orientation') == 2) {
				this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.MIDDLE, y_align: St.Align.START });
			} else {
				this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });
			}

			this.actor._delegate = this;

			this.buttonEnterCallback = (Lang.bind(this, function() {
				// global.log("menyy: user button enter callback");
				this.actor.add_style_class_name('selected');
			}));
			this.buttonLeaveCallback = (Lang.bind(this, function() {
				// global.log("menyy: user button leave callback");
				this.actor.remove_style_class_name('selected');
			}));
			this.buttonPressCallback = (Lang.bind(this, function() {
				this.actor.add_style_pseudo_class('pressed');
			}));
			this.buttonReleaseCallback = (Lang.bind(this, function() {
				this.actor.remove_style_pseudo_class('pressed');
				this.actor.remove_style_class_name('selected');
				this.activate();
			}));
			this.buttonbox = new St.BoxLayout();





			this.label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
			this.label.clutter_text.set_line_wrap(true);
			if (this._showIcon) {
				this.icon = new St.Icon({ style_class: 'popup-menu-icon',
					icon_size: this._iconSize});
				if (settings.get_enum('user-label') == 1) {
					this.label.add_style_class_name('menyy-text-left');
					this.icon.add_style_class_name('menyy-general-button-icon-left');
					this.buttonbox.add(this.label, {x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
				} else if (settings.get_enum('user-label') == 2) {
					this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
				} else {
					this.label.add_style_class_name('menyy-text-right');
					this.icon.add_style_class_name('menyy-general-button-icon-right');
					this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this.label, {x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				}
			} else {
				if (settings.get_enum('user-button-orientation') == 1) {
					this.label.add_style_class_name('menyy-text-right');
				} else if (settings.get_enum('user-button-orientation') == 2) {
					this.label.add_style_class_name('menyy-text-center');
				} else {
					this.label.add_style_class_name('menyy-text-left');
				}
				this.buttonbox.add(this.label, {x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
			}

			this.actor.set_child(this.buttonbox);

			// Connect signals
			this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));

			this._button = menyy;
			this._userLoadedId = this._user.connect('notify::is_loaded', Lang.bind(this, this._onUserChanged));
			this._userChangedId = this._user.connect('changed', Lang.bind(this, this._onUserChanged));
			this.actor.connect('destroy', Lang.bind(this, this._onDestroy));

			// Callbacks to events
			this.actor.connect('enter-event', Lang.bind(this, this.buttonEnterCallback));
			this.actor.connect('leave-event', Lang.bind(this, this.buttonLeaveCallback));
			this.actor.connect('button-press-event', Lang.bind(this, this.buttonPressCallback));
			this.actor.connect('button-release-event', Lang.bind(this, this.buttonReleaseCallback));
			this._onUserChanged();
		},




		// Activate the menu item (Open user account settings)
		activate: function(event) {
			Util.spawnCommandLine("gnome-control-center user-accounts");
			this._button.menu.toggle();
		},

		// Handle changes to user information (redisplay new info)
		_onUserChanged: function() {
			if (this._user.is_loaded) {
				this.label.set_text (this._user.get_real_name());
				if (this.icon) {
					let iconFileName = this._user.get_icon_file();
					let iconFile = Gio.file_new_for_path(iconFileName);
					setIconAsync(this.icon, iconFile, 'avatar-default');
				}
			}
		},

		// Destroy the menu item
		_onDestroy: function() {
			if (this._userLoadedId != 0) {
				this._user.disconnect(this._userLoadedId);
				this._userLoadedId = 0;
			}

			if (this._userChangedId != 0) {
				this._user.disconnect(this._userChangedId);
				this._userChangedId = 0;
			}
		},

		select: function() {
			this._ignoreHoverSelect = true;
			this.buttonEnterCallback.call();
		},

		unSelect: function() {
			// global.log('menyy: unselect')
			this._ignoreHoverSelect = false;
			this.buttonLeaveCallback.call();
		},

		click: function() {
			// global.log('menyy: click')
			this.buttonPressCallback.call();
			this.buttonReleaseCallback.call();
		},

		_onTouchEvent : function (actor, event) {
			// global.log('menyy: touch')
			return Clutter.EVENT_PROPAGATE;
		}

	});

//	Menu item to go back to category view (for arcmenu compatibility)
	const BackMenuItem = new Lang.Class({
		Name: 'Menyy.BackMenuItem',
		// Initialize the menu item
		_init: function(menyy, purpose) {
			this.parent();
			this._iconSize = (settings.get_int('apps-icon-size') > 0) ? settings.get_int('apps-icon-size') : 12;
			this._showIcon = (settings.get_int('apps-icon-size') > 0) ? true : false;
			this.purpose = purpose;    	
			if (this.purpose == 'backtoCategories') {
				this._icon = new St.Icon({ icon_name: 'go-previous-symbolic',
					style_class: 'popup-menu-icon menyy-general-icon-left',
					icon_size: this._iconSize});
				this._label = new St.Label({ text: _("Back"), y_expand: true,
					y_align: Clutter.ActorAlign.CENTER, style_class: 'menyy-back-button-label'});
			} else if (this.purpose == 'backToHome'){
				this._icon = new St.Icon({ icon_name: 'go-previous-symbolic',
					style_class: 'popup-menu-icon menyy-general-icon-left',
					icon_size: this._iconSize});
				this._label = new St.Label({ text: _("Back"), y_expand: true,
					y_align: Clutter.ActorAlign.CENTER, style_class: 'menyy-back-button-label'});
			} else {
				this._icon = new St.Icon({ icon_name: 'go-next-symbolic',
					style_class: 'popup-menu-icon menyy-general-icon-right',
					icon_size: this._iconSize});
				this._label = new St.Label({ text: _("Show Categories"), y_expand: true,
					y_align: Clutter.ActorAlign.CENTER, style_class: 'menyy-back-button-label' });
			}
			let style = "popup-menu-item popup-submenu-menu-item menyy-back-button menyy-general-button";
			this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });
			this.actor._delegate = this;
			this.buttonEnterCallback = (Lang.bind(this, function() {
				this.actor.add_style_class_name('selected');
			}));
			this.buttonLeaveCallback = (Lang.bind(this, function() {
				this.actor.remove_style_class_name('selected');
			}));
			this.buttonPressCallback = (Lang.bind(this, function() {
				this.actor.add_style_pseudo_class('pressed');
			}));
			this.buttonReleaseCallback = (Lang.bind(this, function() {
				this.actor.remove_style_pseudo_class('pressed');
				this.actor.remove_style_class_name('selected');
				this.activate();
			}));
			this.buttonbox = new St.BoxLayout();

			if (this.purpose == 'goToCategories') {
				this.buttonbox.add_child(this._label, { expand: true });
				this.buttonbox.add_child(this._icon);
			} else {
				this.buttonbox.add_child(this._icon);
				this.buttonbox.add_child(this._label, { expand: true });
			}
			this.actor.set_child(this.buttonbox);
			this._button = menyy;
			// Callbacks to events
			this.actor.connect('enter-event', Lang.bind(this, this.buttonEnterCallback));
			this.actor.connect('leave-event', Lang.bind(this, this.buttonLeaveCallback));
			this.actor.connect('button-press-event', Lang.bind(this, this.buttonPressCallback));
			this.actor.connect('button-release-event', Lang.bind(this, this.buttonReleaseCallback));
		},
		// Activate the button (go back to category view)
		activate: function(event) {
			//global.log("menyy -> backbutton -> activate");
			if (this.purpose == 'backToHome') {
				this._button._openDefaultCategory();
			} else {
				this._button._selectCategory('categories');
			}
			if (this._button.searchActive) this._button.resetSearch();
		},
	});

	/*
	 * ========================================================================= /*
	 * name: CategoryButton @desc A button with an icon and label that holds app
	 * info From Menyy project
	 * =========================================================================
	 */
	const CategoryButton = new Lang.Class({
		Name: 'Menyy.CategoryListButton',
		Extends: PopupMenu.PopupBaseMenuItem,

		_init: function (dir, altNameText, altIconName, button) {
			this._settings = convenience.getSettings('org.gnome.shell.extensions.menyy');
			this._button = button;
			this._categoriesViewMode = button._categoriesViewMode;
			this._appsViewMode = button._appsViewMode;
			this._appGridButtonWidth = button._appGridButtonWidth;
			if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
				this.selectionMethod = SelectMethod.CLICK;
			} else {
				this.selectionMethod = this._settings.get_enum('categories-selection-method');
			}
			this.hoverDelay =  this._settings.get_int('categories-hover-delay');
			this._hoverTimeOutId = null;

			let style;
			let styleLabel;
			//TODO(CATEGORIES LABEL SIDE)
			if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
				this._iconSize = (settings.get_int('grid-icon-size') > 0) ? settings.get_int('grid-icon-size') : 32;
				this._showIcon = true;
				style = "popup-menu-item popup-submenu-menu-item menyy-apps-grid-button menyy-category-grid-button";
				styleLabel = "menyy-apps-grid-button-label menyy-category-grid-button-label";
				this.actor = new St.Button({reactive: true, style_class: style, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				this.buttonbox = new St.BoxLayout({vertical: true});
			} else if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.LIST)) {
				this._iconSize = (settings.get_int('apps-icon-size') > 0) ? settings.get_int('apps-icon-size') : 28;
				this._showIcon = (settings.get_int('apps-icon-size') > 0) ? true : false;
				style = "popup-menu-item popup-submenu-menu-item menyy-apps-button menyy-general-button";
				styleLabel = "menyy-apps-button-label menyy-general-button-label";
				this.buttonbox = new St.BoxLayout();
				if (settings.get_enum('categories-button-orientation') == 1) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.END, y_align: St.Align.START });
				} else if (settings.get_enum('categories-button-orientation') == 2) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.MIDDLE, y_align: St.Align.START });
				} else {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });
				}
			} else {
				this._iconSize = (settings.get_int('categories-icon-size') > 0) ? settings.get_int('categories-icon-size') : 24;
				this._showIcon = (settings.get_int('categories-icon-size') > 0) ? true : false;
				style = "popup-menu-item popup-submenu-menu-item menyy-category-button menyy-general-button";
				styleLabel = "menyy-category-button-label menyy-general-button-label";
				this.buttonbox = new St.BoxLayout();
				if (settings.get_enum('categories-button-orientation') == 1) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.END, y_align: St.Align.START });
				} else if (settings.get_enum('categories-button-orientation') == 2) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.MIDDLE, y_align: St.Align.START });
				} else {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });
				}
			}
			this.actor._delegate = this;        

			this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent)); 	
			this.buttonEnterCallback = null;
			this.buttonLeaveCallback = null;
			this.buttonPressCallback = null;
			this.buttonReleaseCallback = null;
			this._ignoreHoverSelect = null;

			this._dir = dir;
			let categoryNameText = "";
			let categoryIconName = null;

			if (typeof dir == 'string') {
				categoryNameText = altNameText;
				categoryIconName = altIconName;
			} else {
				categoryNameText = dir.get_name() ? dir.get_name() : "";
				categoryIconName = dir.get_icon() ? dir.get_icon().get_names().toString() : "error";
			}

			if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
				if (categoryIconName) {
					this.icon = new St.Icon({icon_name: categoryIconName, icon_size: this._iconSize});
					this.label = new St.Label({ text: categoryNameText, style_class: styleLabel });
					this.label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
					this.label.clutter_text.set_line_wrap(true);
					this.buttonbox.add(this.icon, {x_fill: false, y_fill: false,x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this.label, {x_fill: false, y_fill: true, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				}
			} else {
				this.label = new St.Label({ text: categoryNameText, style_class: 'menyy-category-button-label menyy-general-button-label' });
				this.label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
				this.label.clutter_text.set_line_wrap(true);
				if (categoryIconName && this._showIcon) {
					this.icon = new St.Icon({icon_name: categoryIconName, icon_size: this._iconSize});
					if (settings.get_enum('categories-label') == 1) {
						this.label.add_style_class_name('menyy-text-left');
						this.icon.add_style_class_name('menyy-general-button-icon-left');
						this.buttonbox.add(this.label, {x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
						this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					} else if (settings.get_enum('categories-label') == 2) {
						this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					} else {
						this.label.add_style_class_name('menyy-text-right');
						this.icon.add_style_class_name('menyy-general-button-icon-right');
						this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
						this.buttonbox.add(this.label, {x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
					}
				} else {
					if (settings.get_enum('categories-button-orientation') == 1) {
						this.label.add_style_class_name('menyy-text-right');
					} else if (settings.get_enum('categories-button-orientation') == 2) {
						this.label.add_style_class_name('menyy-text-center');
					} else {
						this.label.add_style_class_name('menyy-text-left');
					}
					this.buttonbox.add(this.label, {x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				}
			}


			this.actor.set_child(this.buttonbox);

			// Connect signals
			this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));
			this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));
			this.actor.connect('button-release-event', Lang.bind(this, this._onButtonReleaseEvent));
			this.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
			this.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));

		},


		// Activate the category
		activate: function(event) {
			this._button._selectCategory(this._dir);
			this.parent(event);
		},


		_onButtonPressEvent: function(actor, event) {
			this._button._selectCategory(this);
		},

		_onButtonReleaseEvent: function (actor, event) {
			actor.remove_style_pseudo_class('pressed');
			actor.remove_style_class_name('selected');
		},

		_onTouchEvent : function (actor, event) {
			return Clutter.EVENT_PROPAGATE;
		},

		_onEnterEvent: function(actor, event) {
			actor.add_style_class_name('selected');
			if (this._ignoreHoverSelect)
				return;
			if (this.selectionMethod == SelectMethod.HOVER ) {
				this._hoverTimeoutId = Mainloop.timeout_add((this.hoverDelay >0) ? this.hoverDelay : 0, Lang.bind(this, function() {
					this._button._selectCategory(this);
					this._hoverTimeoutId = 0;
				}));
			}
		},

		_onLeaveEvent: function(actor, event) {
			actor.remove_style_class_name('selected');
			if (this.selectionMethod == SelectMethod.HOVER ) {
				if (this._hoverTimeoutId > 0) {
					Mainloop.source_remove(this._hoverTimeoutId);
				}
			}
		},


		setButtonEnterCallback: function(cb) {
			this.buttonEnterCallback = cb;
			this.actor.connect('enter-event', Lang.bind(this, this.buttonEnterCallback));
		},

		setButtonLeaveCallback: function(cb) {
			this.buttonLeaveCallback = cb;
			this.actor.connect('leave-event', Lang.bind(this, this.buttonLeaveCallback));
		},

		setButtonPressCallback: function(cb) {
			this.buttonPressCallback = cb;
			this.actor.connect('button-press-event', Lang.bind(this, this.buttonPressCallback));
		},

		setButtonReleaseCallback: function(cb) {
			this.buttonReleaseCallback = cb;
			this.actor.connect('button-release-event', Lang.bind(this, this.buttonReleaseCallback));
		},

		select: function() {
			this._ignoreHoverSelect = true;
			this.buttonEnterCallback.call();
		},

		unSelect: function() {
			this._ignoreHoverSelect = false;
			this.buttonLeaveCallback.call();
		},

		click: function() {
			this.buttonPressCallback.call();
			this.buttonReleaseCallback.call();
		}
	});



	/*
	 * ========================================================================= /*
	 * name: AppButton @desc A button with an icon and label that holds app info
	 * for various @desc types of sources From Menyy
	 * project
	 * =========================================================================
	 */
	const AppButton = new Lang.Class({
		Name: 'Menyy.AppButton',
		Extends: PopupMenu.PopupBaseMenuItem,


		_init: function (app, button, location) {
			this.parent();
			this._appsViewMode = button._appsViewMode;
			this._button = button;
			this.app = app;
			this._type = app.appType || AppType.APPLICATION;	// gets apptype from the generator and the only one without apptype is APPLICATION
			this._stateChangedId = 0;
			this._isLeftDown = false;
			this._isTimeOutOpen = false;
			this._isDragged = false;
			this._labelStyle = null;
			this._iconStyle = null;
			this._appGridButtonWidth = button._appGridButtonWidth;
			this._showLabel = true;
			let homePath = GLib.get_home_dir();	
			let style;

			if (location == 'places') {
				this._labelStyle = 'menyy-general-button-label';
				this._iconStyle = 'menyy-general-button-icon'
					this._iconSize = (settings.get_int('places-icon-size') > 0) ? settings.get_int('places-icon-size') : 16;
					this._showIcon = (settings.get_int('places-icon-size') > 0) ? true : false;
					style = "popup-menu-item menyy-shortcuts-button menyy-general-button";
			} else if (this._appsViewMode == ApplicationsViewMode.LIST){
				this._labelStyle = 'menyy-apps-button-label menyy-general-button-label';
				this._iconStyle = 'menyy-apps-button-icon menyy-general-button-icon'
					this._iconSize = (settings.get_int('apps-icon-size') > 0) ? settings.get_int('apps-icon-size') : 28;
					this._showIcon = (settings.get_int('apps-icon-size') > 0) ? true : false;
					style = "popup-menu-item popup-submenu-menu-item menyy-apps-button menyy-general-button";
			} else {
				this._labelStyle = 'menyy-apps-grid-button-label';
				this._iconStyle = 'menyy-apps-grid-button-icon'
					this._iconSize = (settings.get_int('grid-icon-size') > 0) ? settings.get_int('grid-icon-size') : 32;
					this._showIcon = (settings.get_int('grid-icon-size') > 0) ? true : false;
					style = "popup-menu-item popup-submenu-menu-item menyy-apps-grid-button";
			}

			if (this._appsViewMode == ApplicationsViewMode.LIST || location == 'places'){
				if (settings.get_enum('apps-button-orientation') == 1 && (this._type != AppType.PLACE)) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.END, y_align: St.Align.MIDDLE});
				} else if (settings.get_enum('apps-button-orientation') == 2 && (this._type != AppType.PLACE)) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				} else if (settings.get_enum('places-button-orientation') == 1 && (this._type == AppType.PLACE)) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.END, y_align: St.Align.MIDDLE});
				} else if (settings.get_enum('places-button-orientation') == 2 && this._type == AppType.PLACE) {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				} else {
					this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.MIDDLE});
				}
			} else {
				this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
			}

			this.actor._delegate = this;

			// actor events
			this.actor.connect('destroy', Lang.bind(this,
					function() {
				// textureCache.disconnect(iconThemeChangedId);
			}));
			this.actor.connect('popup-menu', Lang.bind(this, this._onKeyboardPopupMenu));      

			this._menu = null;
			this._menuManager = new PopupMenu.PopupMenuManager(this);
			this._menuTimeoutId = 0;
			this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));
			this.actor.connect('button-release-event', Lang.bind(this, this._onButtonReleaseEvent));
			this.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
			this.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));

			// Set labels and icons
			if (this._type == AppType.APPLICATION) {
				this.icon = app.create_icon_texture(this._iconSize);
				this.label = new St.Label({ text: app.get_name(), style_class: this._labelStyle });
			} else if (this._type == AppType.PLACE || this._type == AppType.WEBBOOKMARK) {
				this.icon = new St.Icon({gicon: app.icon, icon_size: this._iconSize});
				if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
				this.label = new St.Label({ text: app.name, style_class: this._labelStyle });
			} else if (this._type == AppType.FILE || this._type == AppType.FOLDER) {
				if (settings.get_boolean('show-thumbnails') == true) {
					let thumbnail = generateMD5(this.app.uri);
					let normalThumbnail = homePath + "/.cache/thumbnails/normal/" + thumbnail + ".png";
					let largeThumbnail = homePath + "/.cache/thumbnails/large/" + thumbnail + ".png";
					let gicon = Gio.content_type_get_icon(app.mime);
					this.icon = new St.Icon({ style_class: 'popup-menu-icon', icon_size: this._iconSize});
					this.label = new St.Label({ text: app.name, style_class: this._labelStyle });
					// because videos only have large thumbnails
					let normalIconFile = Gio.file_new_for_path(normalThumbnail);
					let largeIconFile = Gio.file_new_for_path(largeThumbnail);
					setThumbnailAsync(this.icon, normalIconFile, largeIconFile, 'error', gicon);
				} else {
					let gicon = Gio.content_type_get_icon(app.mime);
		            this.icon = new St.Icon({gicon: gicon, icon_size: this._iconSize});
		            if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
		            this.label = new St.Label({ text: app.name, style_class: this._labelStyle });
				}
			} else if (this._type == AppType.TERMINAL) {
				this.icon = new St.Icon({gicon: app.icon, icon_size: this._iconSize});
				if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
				this.label = new St.Label({ text: app.name, style_class: this._labelStyle });
			} else if (this._type == AppType.ANSWER) {
				this.icon = new St.Icon({gicon: app.icon, icon_size: this._iconSize});
				if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
				this.label = new St.Label({ text: app.name, style_class: this._labelStyle });
			} else if (this._type == AppType.COLOURANSWER) {
				this.icon = new St.Icon({gicon: app.icon, icon_size: this._iconSize});
				if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
				this.label = new St.Label({ text: app.name, style_class: this._labelStyle });
				//this.actor.set_style( 'background-color: ' + this.app.colour);
				this.icon.set_style( 'background-color: ' + this.app.colour);
			}

			// Create button
			if (this._appsViewMode == ApplicationsViewMode.LIST || location == 'places') {
				this.buttonbox = new St.BoxLayout();
			} else { 
				this.buttonbox = new St.BoxLayout({vertical: true});
			}
			
			
			

			// Create an icon container (for theming and indicator support)
			this._iconContainer = new St.BoxLayout({vertical: true});
			this._iconContainer.add_style_class_name(this._iconStyle);


			// Set run indicator
			this._dot = new St.Widget({ style_class: 'app-well-app-running-dot',
				layout_manager: new Clutter.BinLayout(),
				x_expand: true, y_expand: true,
				x_align: Clutter.ActorAlign.CENTER,
				y_align: Clutter.ActorAlign.END });

			if (this._showIcon) {
				this._iconContainer.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.END, y_align: St.Align.END});

				if (location == 'apps') {
					this._iconContainer.add(this._dot, {x_fill: false, y_fill: false, x_align: St.Align.END, y_align: St.Align.END});
				}

			}

			// Check if running state
			this._dot.opacity = 0;
			this._onStateChanged();

			// Create button and add labol, icon and indicator
			if (this._appsViewMode == ApplicationsViewMode.LIST){
				// Wraps text if too long
				this.label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
				this.label.clutter_text.set_line_wrap(true);

				if (settings.get_enum('apps-label') == 0 && (this._type != AppType.PLACE)) {
					this.label.add_style_class_name('menyy-text-left');
					this._iconContainer.add_style_class_name('menyy-general-button-icon-right');

					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
				} else if (settings.get_enum('apps-label') == 1  && (this._type != AppType.PLACE)){
					this.label.add_style_class_name('menyy-text-right');
					this._iconContainer.add_style_class_name('menyy-general-button-icon-left');

					this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.END});
				} else if ((this._type != AppType.PLACE)  && this._showIcon) {
					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});


				} else if (settings.get_enum('places-label') == 0 && this._type == AppType.PLACE  && this._showIcon) {
					this.label.add_style_class_name('menyy-text-left');
					this._iconContainer.add_style_class_name('menyy-general-button-icon-right');

					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
				} else if (settings.get_enum('places-label') == 1 && this._type == AppType.PLACE  && this._showIcon){
					this.label.add_style_class_name('menyy-text-right');
					this._iconContainer.add_style_class_name('menyy-general-button-icon-left');

					this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.END});
				} else if (this._type == AppType.PLACE && this._showIcon){
					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				} else {
					if ((this._type != AppType.PLACE)) {
						if (settings.get_enum('apps-button-orientation') == 1) {
							this.label.add_style_class_name('menyy-text-right');
						} else if (settings.get_enum('apps-button-orientation') == 2) {
							this.label.add_style_class_name('menyy-text-center');
						} else {
							this.label.add_style_class_name('menyy-text-left');
						}
					} else {
						if (settings.get_enum('places-button-orientation') == 1) {
							this.label.add_style_class_name('menyy-text-right');
						} else if (settings.get_enum('places-button-orientation') == 2) {
							this.label.add_style_class_name('menyy-text-center');
						} else {
							this.label.add_style_class_name('menyy-text-left');
						}
					}

					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
				}
			} else {
				if (settings.get_enum('places-label') == 0 && this._type == AppType.PLACE  && this._showIcon) {
					this.label.add_style_class_name('menyy-text-left');
					this._iconContainer.add_style_class_name('menyy-general-button-icon-right');

					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
				} else if (settings.get_enum('places-label') == 1 && this._type == AppType.PLACE  && this._showIcon){
					this.label.add_style_class_name('menyy-text-right');
					this._iconContainer.add_style_class_name('menyy-general-button-icon-left');

					this.buttonbox.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.END});
				} else if (this._type == AppType.PLACE && this._showIcon){
					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
				} else {
					this.buttonbox.add(this._iconContainer, {x_fill: false, y_fill: false,x_align: St.Align.MIDDLE, y_align: St.Align.START});
					// Use pango to wrap label text
					this.label.clutter_text.line_wrap = true;
					this.label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
					this.buttonbox.add(this.label, {x_fill: false, y_fill: true, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, expand: true});
				}
			}
			this.actor.set_child(this.buttonbox);

			// Connect signals
			this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));
			if (this._type == AppType.APPLICATION) {
				this._stateChangedId = this.app.connect('notify::state', Lang.bind(this, this._onStateChanged));
			}
			// Connect drag-n-drop signals
			this._draggable = DND.makeDraggable(this.actor);
			this._draggable.connect('drag-begin', Lang.bind(this, function () {
				this._isDragged = true;
				Main.overview.beginItemDrag(this);
				Shell.util_set_hidden_from_pick(Main.legacyTray.actor, true);
			}));
			this._draggable.connect('drag-cancelled', Lang.bind(this, function () {
				this._isDragged = false;
				this.actor.remove_style_pseudo_class('pressed');
				this.actor.remove_style_class_name('selected');
				Main.overview.cancelledItemDrag(this);
			}));
			this._draggable.connect('drag-end', Lang.bind(this, function () {
				this._isDragged = false;
				this.actor.remove_style_pseudo_class('pressed');
				this.actor.remove_style_class_name('selected');
				Main.overview.endItemDrag(this);
				Shell.util_set_hidden_from_pick(Main.legacyTray.actor, false);
			}));
		},

		activate: function(event) {
			if (this._type == AppType.APPLICATION) {
				this.app.open_new_window(-1);
			} else if (this._type == AppType.PLACE) {
				if (this.app.uri) {
					this.app.app.launch_uris([this.app.uri], null);
				} else {
					this.app.launch();
				}
			} else if (this._type == AppType.FILE || this._type == AppType.FOLDER){
				global.log("menyy app uri: " + this.app.uri.toString());
				Gio.app_info_launch_default_for_uri(this.app.uri, global.create_app_launch_context(0, -1));
			} else if (this._type == AppType.TERMINAL) {
				this.app.launch();
			} else if (this._type == AppType.ANSWER) {
				this.app.launch();
			}
			this.parent(event);
			this._button._toggleMenu();
			return Clutter.EVENT_STOP;
		},

		popupMenu: function() {
			if (this._type != AppType.ANSWER) {
				this._button.toggleMenuFlag = false;
				this._removeMenuTimeout();
	
				if (this._draggable)
					this._draggable.fakeRelease();
	
				if (!this._menu) {
					this._menu = new RightClickMenus.AppItemMenu(this);
					this._menu.connect('activate-window', Lang.bind(this, function (menu, window) {
						this.activateWindow(window);
					}));
					this._menu.connect('open-state-changed', Lang.bind(this, function (menu, isPoppedUp) {
						if (!isPoppedUp)
							this._onMenuPoppedDown();
					}));
					let id = Main.overview.connect('hiding', Lang.bind(this, function () {
					}));
					this.actor.connect('destroy', function() {
						Main.overview.disconnect(id);
					});
	
					this._menuManager.addMenu(this._menu);
				}
	
				this.emit('menu-state-changed', true);
	
				this.actor.set_hover(true);
				this._menu.popup();
				// Don't close the menu if right button is released and don't require
				// double click if held down left button is released
				if (!this._isTimeOutOpen) (this._menuManager.ignoreRelease());
				return false;
			}
		},

		_onKeyboardPopupMenu: function() {
			this.popupMenu();
			this._menu.actor.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
		},

		_onButtonPressEvent: function(actor, event) {
			if (!this._isDragged){
				let button = event.get_button();
				if (button == 1) {
					this._isLeftDown = true;
					if (!this._isTimeOutOpen) {
						this._setPopupTimeout();
					} else {
						this._isTimeOutOpen = false;
					}
				} else if (button == 3) {
					// This side works
					if (!this._isLeftDown) this.popupMenu();
				}
				return Clutter.EVENT_PROPAGATE;
			}
		},

		_onButtonReleaseEvent: function (actor, event) {
			actor.remove_style_pseudo_class('pressed');
			actor.remove_style_class_name('selected');
			let button = event.get_button();
			if (button == 1) this._isLeftDown = false;
			if (button == 1 && (!this._isTimeOutOpen)) {
				// This side works!
				this._removeMenuTimeout();
				this.activate(event);
			} else if (this._isTimeOutOpen) {
				return Clutter.EVENT_PROPAGATE;
			} else {
				return GLib.SOURCE_REMOVE;
			}
		},

		_onTouchEvent: function (actor, event) {
			if (event.type() == Clutter.EventType.TOUCH_BEGIN)
				this._setPopupTimeout();

			return Clutter.EVENT_PROPAGATE;
		},

		_onEnterEvent: function(actor, event) {
			actor.add_style_class_name('selected');
		},

		_onLeaveEvent: function(actor, event) {
			actor.remove_style_class_name('selected');	
			this._removeMenuTimeout();
		},

		_onStateChanged: function() {
			if (this._type == AppType.APPLICATION) {
				if (this.app.state != Shell.AppState.STOPPED) {
					this._dot.opacity = 255;
				} else {
					this._dot.opacity = 0;
				}
			}
		},

		_onMenuPoppedDown: function() {
			this._button.toggleMenuFlag = true;
			this._isTimeOutOpen = false;
			this.actor.remove_style_pseudo_class('pressed');
			this.actor.remove_style_class_name('selected');

			this.actor.sync_hover();
			this.emit('menu-state-changed', false);
			// this._button._toggleMenu();
			// return false;
			// return Clutter.EVENT_PROPAGATE;
			return Clutter.EVENT_STOP;
		},

		_removeMenuTimeout: function() {
			if (this._menuTimeoutId > 0) {
				Mainloop.source_remove(this._menuTimeoutId);
				this._menuTimeoutId = 0;
			}
		},

		_setPopupTimeout: function() {
			this._removeMenuTimeout();
			if (!this._isDragged){
				this._menuTimeoutId = Mainloop.timeout_add(AppDisplay.MENU_POPUP_TIMEOUT,
						Lang.bind(this, function() {
							if (!this._isDragged){
								this._isTimeOutOpen = true;
								this._isLeftDown = false;
								this._menuTimeoutId = 0;
								this.popupMenu();
							} else {
								this.actor.remove_style_pseudo_class('pressed');
								this.actor.remove_style_class_name('selected');
								return false;
							}
						}));
				GLib.Source.set_name_by_id(this._menuTimeoutId, '[gnome-shell] this.popupMenu');
				//global.log("menyy: setpopuptimeout ending")
				return false;
			}
		},

		getDragActor: function() {
			let appIcon;
			if (this._type == AppType.APPLICATION) {
				appIcon = this.app.create_icon_texture(this._iconSize);
			} else if (this._type == AppType.PLACE) {
				appIcon = new St.Icon({gicon: this.app.icon, icon_size: this._iconSize});
			} else if (this._type == AppType.FILE || this._type == AppType.FOLDER) {
				let gicon = Gio.content_type_get_icon(this.app.mime);
				appIcon = new St.Icon({gicon: gicon, icon_size: this._iconSize});
			} else if (this._type == AppType.TERMINAL) {
				appIcon = new St.Icon({gicon: this.app.icon, icon_size: this._iconSize});
			} else if (this._type == AppType.WEBBOOKMARK) {
				appIcon = new St.Icon({gicon: this.app.icon, icon_size: this._iconSize});
			} else if (this._type == AppType.ANSWER) {
				appIcon = new St.Icon({gicon: this.app.icon, icon_size: this._iconSize});
			}
			return appIcon;
		},


		// Returns the original actor that should align with the actor
		// we show as the item is being dragged.
		getDragActorSource: function() {
			return this.icon;
		},

		shellWorkspaceLaunch : function(params) {
			params = Params.parse(params, { workspace: -1,
				timestamp: 0 });

			if (this._type == AppType.APPLICATION) {
				this.app.open_new_window(params.workspace);
			} else if (this._type == AppType.PLACE) {
				if (this.app.uri) {
					this.app.app.launch_uris([this.app.uri], null);
				} else {
					this.app.launch();
				}
			} else if (this._type == AppType.FILE || this._type == AppType.FOLDER) {
				Gio.app_info_launch_default_for_uri(this.app.uri, global.create_app_launch_context(0, -1));
			}

			this.actor.remove_style_pseudo_class('pressed');
			this.actor.remove_style_class_name('selected');

			if (menyy.appsMenuButton) {
				if (menyy.appsMenuButton.menu.isOpen)
					menyy.appsMenuButton.menu.toggle();
			}
		},

		// If button destroyed!!!!!!!!!!!
		_onDestroy: function() {
			this.parent();
			this._removeMenuTimeout();
		}
	});

	/*
	 * ========================================================================= /*
	 * name: ShortcutButton @desc A button with an icon that holds app info
	 * =========================================================================
	 */

	const ShortcutButton = new Lang.Class({
		Name: 'Menyy.ShortcutButton',

		_init: function (app, appType) {
			this._iconSize = 16;
			this._showIcon = true;
			this.app = app;
			this._type = appType;
			let style = "popup-menu-item menyy-shortcut-button";
			this.actor = new St.Button({ reactive: true, style_class: style, x_align: St.Align.START, y_align: St.Align.START });
			this.actor._delegate = this;

			this.actor.add_style_class_name('menyy-shortcuts-button');
			this.icon = new St.Icon({gicon: app.getIcon(), icon_size: this._iconSize, style_class: 'menyy-shortcuts-icon'});
			if(!this.icon) this.icon = new St.Icon({icon_name: 'error', icon_size: this._iconSize, icon_type: St.IconType.FULLCOLOR});
			this.label = new St.Label({ text: app.name, style_class: 'menyy-shortcuts-button-label' });

			this.buttonbox = new St.BoxLayout();
			if (this._showIcon) this.buttonbox.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE});
			this.buttonbox.add(this.label, {x_fill: false, y_fill: true, x_align: St.Align.START, y_align: St.Align.MIDDLE});

			this.actor.set_child(this.buttonbox);

			// Connect signals
			this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));
		},

		_onTouchEvent : function (actor, event) {
			return Clutter.EVENT_PROPAGATE;
		}
	});