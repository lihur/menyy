# menyy
A gnome menu.


Issues that need implementing/fixing but are way harder than it should be... or my patience allows to deal with:

Drag and Drop into browser and filemanager put on hold, because it doesn't look like gnome-shell-extensions can actually do it (in a reasonable way).
I've tried checking underneath the cursor while dropping a file, but half the time it detects nautilus instead of the correct window and every once in a while it detects nothing.
Seems like it actually detects if the focused window is under the cursor, which is useless!
Also no real way to "drop" a file or uri, that I've found!

Currently opening a right click submenu closes the menu, because gnome-shell doesn't appear use hierarchical menus and a "grab helper" conveniantly helps not keep the parent menu open.
It doesn't retract from functionality, but sadly leaves the menu with an unpolished look.
Maybe once everything else is implemented, I'll create a proper hierarchical menu that can be used for right-clicking!

It appears that copying files isn't really supported properly either, or just undocumented.
Can be done through xcopy though.
