(function () {
    'use strict';

    /**
     * CKEDITOR.tools class utility which adds additional methods to those of CKEditor.
     *
     * @class CKEDITOR.tools
     */

    /**
     * Debounce util function. If a function execution is expensive, it might be debounced. This means
     * that it will be executed after some amount of time after its last call. For example, if we attach a
     * a function on scroll event, it might be called hundreds times per second. In this case it may be
     * debounced with, let's say 100ms. The real execution of this function will happen 100ms after last
     * scroll event.
     *
     * @static
     * @method debounce
     * @param {Function} callback The callback which has to be called after given timeout.
     * @param {Number} timeout Timeout in milliseconds after which the callback will be called.
     * @param {Object} context The context in which the callback will be called. This argument is optional.
     * @param {Array} args An array of arguments which the callback will receive.
     */

    CKEDITOR.tools.debounce = CKEDITOR.tools.debounce || function (callback, timeout, context, args) {
        var debounceHandle;

        var callFn = function () {
            var callContext = context || this;

            clearTimeout(debounceHandle);

            var result = [];

            for (var len = arguments.length, startIndex = 0; startIndex < len; ++startIndex) {
                result.push(arguments[startIndex]);
            }

            var callArgs = result.concat(args || []);

            debounceHandle = setTimeout(function () {
                callback.apply(callContext, callArgs);
            }, timeout);
        };

        callFn.detach = function () {
            clearTimeout(debounceHandle);
        };

        return callFn;
    };
})();
(function () {
    'use strict';

    var REGEX_URI_SCHEME = /^(?:[a-z][a-z0-9+\-.]*)\:|^\//i;

    /**
     * Link class utility. Provides methods for create, delete and update links.
     *
     * @class CKEDITOR.Link
     * @constructor
     * @param {Object} editor The CKEditor instance.
     */

    function Link(editor) {
        this._editor = editor;
    }

    Link.prototype = {
        constructor: Link,

        /**
         * Create a link with given URI as href.
         *
         * @method create
         * @param {String} URI The URI of the link.
         * @param {Object} attrs A config object with link attributes. These might be arbitrary DOM attributes.
         */
        create: function (URI, attrs) {
            var selection = this._editor.getSelection();

            var range = selection.getRanges()[0];

            if (range.collapsed) {
                var text = new CKEDITOR.dom.text(URI, this._editor.document);
                range.insertNode(text);
                range.selectNodeContents(text);
            }

            URI = this._getCompleteURI(URI);

            var linkAttrs = CKEDITOR.tools.merge({
                'data-cke-saved-href': URI,
                href: URI
            }, attrs);

            var style = new CKEDITOR.style({
                attributes: linkAttrs,
                element: 'a'
            });

            style.type = CKEDITOR.STYLE_INLINE;
            style.applyToRange(range, this._editor);
            range.select();
        },

        /**
         * Retrieves a link from the current selection.
         *
         * @method getFromSelection
         * @return {CKEDITOR.dom.element} The retrieved link or null if not found.
         */
        getFromSelection: function () {
            var selection = this._editor.getSelection();

            var selectedElement = selection.getSelectedElement();

            if (selectedElement && selectedElement.is('a')) {
                return selectedElement;
            }

            var range = selection.getRanges()[0];

            if (range) {
                range.shrink(CKEDITOR.SHRINK_TEXT);

                return this._editor.elementPath(range.getCommonAncestor()).contains('a', 1);
            }

            return null;
        },

        /**
         * Removes a link from the editor.
         *
         * @param {CKEDITOR.dom.element} link The link element which link style should be removed.
         * @method remove
         */
        remove: function (link) {
            var editor = this._editor;

            if (link) {
                link.remove(editor);
            } else {
                var style = new CKEDITOR.style({
                    alwaysRemoveElement: 1,
                    element: 'a',
                    type: CKEDITOR.STYLE_INLINE
                });

                // 'removeStyle()' removes the style from the editor's current selection.
                //  We need to force the selection to be the whole link element
                //  to remove it properly.

                var selection = editor.getSelection();
                selection.selectElement(selection.getStartElement());

                editor.removeStyle(style);
            }
        },

        /**
         * Updates the href of an already existing link.
         *
         * @method update
         * @param {Object|String} attrs The attributes to update or remove. Attributes with null values will be removed.
         * @param {CKEDITOR.dom.element} link The link element which href should be removed.
         */
        update: function (attrs, link) {
            link = link || this.getFromSelection();

            if (typeof attrs === 'string') {
                link.setAttributes({
                    'data-cke-saved-href': attrs,
                    href: attrs
                });
            } else if (typeof attrs === 'object') {
                var removeAttrs = [];
                var setAttrs = {};

                Object.keys(attrs).forEach(function (key) {
                    if (attrs[key] === null) {
                        if (key === 'href') {
                            removeAttrs.push('data-cke-saved-href');
                        }

                        removeAttrs.push(key);
                    } else {
                        if (key === 'href') {
                            setAttrs['data-cke-saved-href'] = attrs[key];
                        }

                        setAttrs[key] = attrs[key];
                    }
                });

                link.removeAttributes(removeAttrs);
                link.setAttributes(setAttrs);
            }
        },

        /**
         * Checks if the URI has a scheme. If not, the default 'http' scheme with
         * hierarchical path '//' is added to it.
         *
         * @protected
         * @method _getCompleteURI
         * @param {String} URI The URI of the link.
         * @return {String} The URI updated with the protocol.
         */
        _getCompleteURI: function (URI) {
            if (!REGEX_URI_SCHEME.test(URI)) {
                URI = 'http://' + URI;
            }

            return URI;
        }
    };

    CKEDITOR.Link = CKEDITOR.Link || Link;
})();
(function () {
    'use strict';

    if (CKEDITOR.plugins.get('ae_selectionregion')) {
        return;
    }

    CKEDITOR.SELECTION_TOP_TO_BOTTOM = 0;
    CKEDITOR.SELECTION_BOTTOM_TO_TOP = 1;
    CKEDITOR.SELECTION_LEFT_TO_RIGHT = 2;
    CKEDITOR.SELECTION_RIGHT_TO_LEFT = 3;

    /**
     * SelectionRegion utility class which provides metadata about the selection. The metadata may be the start and end
     * rectangles, caret region, etc. **This class is not intended to be used standalone. Its functions will
     * be merged into each editor instance, so the developer may use them directly via the editor, without making
     * an instance of this class**.
     *
     * @class CKEDITOR.plugins.ae_selectionregion
     * @constructor
     */
    function SelectionRegion() {}

    SelectionRegion.prototype = {
        constructor: SelectionRegion,

        /**
         * Creates selection from two points in page coordinates.
         *
         * @method createSelectionFromPoint
         * @param {Number} x X point in page coordinates.
         * @param {Number} y Y point in page coordinates.
         */
        createSelectionFromPoint: function (x, y) {
            this.createSelectionFromRange(x, y, x, y);
        },

        /**
         * Creates selection from range. A range consists from two points in page coordinates.
         *
         * @method createSelectionFromRange
         * @param {Number} startX X coordinate of the first point.
         * @param {Number} startY Y coordinate of the first point.
         * @param {Number} endX X coordinate of the second point.
         * @param {Number} endY Y coordinate of the second point.
         */
        createSelectionFromRange: function (startX, startY, endX, endY) {
            var end;
            var endContainer;
            var endOffset;
            var range;
            var start;
            var startContainer;
            var startOffset;

            if (typeof document.caretPositionFromPoint === 'function') {
                start = document.caretPositionFromPoint(startX, startY);
                end = document.caretPositionFromPoint(endX, endY);

                startContainer = start.offsetNode;
                endContainer = end.offsetNode;

                startOffset = start.offset;
                endOffset = end.offset;

                range = this.createRange();
            } else if (typeof document.caretRangeFromPoint === 'function') {
                start = document.caretRangeFromPoint(startX, startY);
                end = document.caretRangeFromPoint(endX, endY);

                startContainer = start.startContainer;
                endContainer = end.startContainer;

                startOffset = start.startOffset;
                endOffset = end.startOffset;

                range = this.createRange();
            }

            if (range && document.getSelection) {
                range.setStart(new CKEDITOR.dom.node(startContainer), startOffset);
                range.setEnd(new CKEDITOR.dom.node(endContainer), endOffset);

                this.getSelection().selectRanges([range]);
            } else if (typeof document.body.createTextRange === 'function') {
                var selection = this.getSelection();

                selection.unlock();

                range = document.body.createTextRange();
                range.moveToPoint(startX, startY);

                var endRange = range.duplicate();
                endRange.moveToPoint(endX, endY);

                range.setEndPoint('EndToEnd', endRange);
                range.select();

                this.getSelection().lock();
            }
        },

        /**
         * Returns the region of the current position of the caret. The points are in page coordinates.
         *
         * @method getCaretRegion
         * @return {Object} Returns object with the following properties:
         * - bottom
         * - left
         * - right
         * - top
         */
        getCaretRegion: function () {
            var selection = this.getSelection();

            var region = {
                bottom: 0,
                left: 0,
                right: 0,
                top: 0
            };

            var bookmarks = selection.createBookmarks();

            if (!bookmarks.length) {
                return region;
            }

            var bookmarkNodeEl = bookmarks[0].startNode.$;

            bookmarkNodeEl.style.display = 'inline-block';

            var region = new CKEDITOR.dom.element(bookmarkNodeEl).getClientRect();

            bookmarkNodeEl.parentNode.removeChild(bookmarkNodeEl);

            var scrollPos = new CKEDITOR.dom.window(window).getScrollPosition();

            region.bottom = scrollPos.y + region.bottom, region.left = scrollPos.x + region.left, region.right = scrollPos.x + region.right, region.top = scrollPos.y + region.top;

            return region;
        },

        /**
         * Returns data for the current selection.
         *
         * @method getSelectionData
         * @return {Object|null} Returns an object with the following data:
         * - element - The currently selected element, if any
         * - text - The selected text
         * - region - The data, returned from {{#crossLink "CKEDITOR.plugins.ae_selectionregion/getSelectionRegion:method"}}{{/crossLink}}
         */
        getSelectionData: function () {
            var selection = this.getSelection();

            if (!selection.getNative()) {
                return null;
            }

            var result = {
                element: selection.getSelectedElement(),
                text: selection.getSelectedText()
            };

            result.region = this.getSelectionRegion(selection);

            return result;
        },

        /**
         * Returns the region of the current selection.
         *
         * @method getSelectionRegion
         * @return {Object} Returns object which is being returned from
         * {{#crossLink "CKEDITOR.plugins.ae_selectionregion/getClientRectsRegion:method"}}{{/crossLink}} with three more properties:
         * - direction - the direction of the selection. Can be one of these:
         *   1. CKEDITOR.SELECTION_TOP_TO_BOTTOM
         *   2. CKEDITOR.SELECTION_BOTTOM_TO_TOP
         * - height - The height of the selection region
         * - width - The width of the selection region
         */
        getSelectionRegion: function () {
            var region = this.getClientRectsRegion();

            region.direction = this.getSelectionDirection();

            region.height = region.bottom - region.top;
            region.width = region.right - region.left;

            return region;
        },

        /**
         * Returns true if the current selection is empty, false otherwise.
         *
         * @method isSelectionEmpty
         * @return {Boolean} Returns true if the current selection is empty, false otherwise.
         */
        isSelectionEmpty: function () {
            var ranges;

            var selection = this.getSelection();

            return selection.getType() === CKEDITOR.SELECTION_NONE || (ranges = selection.getRanges()) && ranges.length === 1 && ranges[0].collapsed;
        },

        /**
         * Returns object with data about the [client rectangles](https://developer.mozilla.org/en-US/docs/Web/API/Element.getClientRects) of the selection,
         * normalized across browses. All offsets below are in page coordinates.
         *
         * @method getClientRectsRegion
         * @return {Object} Returns object with the following data:
         * - bottom - bottom offset of all client rectangles
         * - left - left offset of all client rectangles
         * - right - right offset of all client rectangles
         * - top - top offset of all client rectangles
         * - startRect - An Object, which contains the following information:
         *     + bottom - bottom offset
         *     + height - the height of the rectangle
         *     + left - left offset of the selection
         *     + right - right offset of the selection
         *     + top - top offset of the selection
         *     + width - the width of the rectangle
         * - endRect - An Object, which contains the following information:
         *     + bottom - bottom offset
         *     + height - the height of the rectangle
         *     + left - left offset of the selection
         *     + right - right offset of the selection
         *     + top - top offset of the selection
         *     + width - the width of the rectangle
         *
         * If there is no native selection, the objects will be filled with 0.
         */
        getClientRectsRegion: function () {
            var selection = this.getSelection();
            var nativeSelection = selection.getNative();

            var defaultRect = {
                bottom: 0,
                height: 0,
                left: 0,
                right: 0,
                top: 0,
                width: 0
            };

            var region = {
                bottom: 0,
                endRect: defaultRect,
                left: 0,
                right: 0,
                top: 0,
                startRect: defaultRect
            };

            if (!nativeSelection) {
                return region;
            }

            var bottom = 0;
            var clientRects;
            var left = Infinity;
            var rangeCount;
            var right = -Infinity;
            var top = Infinity;

            if (nativeSelection.createRange) {
                clientRects = nativeSelection.createRange().getClientRects();
            } else {
                rangeCount = nativeSelection.rangeCount;
                clientRects = nativeSelection.rangeCount > 0 ? nativeSelection.getRangeAt(0).getClientRects() : [];
            }

            if (clientRects.length === 0) {
                region = this.getCaretRegion();
            } else {
                for (var i = 0, length = clientRects.length; i < length; i++) {
                    var item = clientRects[i];

                    if (item.left < left) {
                        left = item.left;
                    }

                    if (item.right > right) {
                        right = item.right;
                    }

                    if (item.top < top) {
                        top = item.top;
                    }

                    if (item.bottom > bottom) {
                        bottom = item.bottom;
                    }
                }

                var scrollPos = new CKEDITOR.dom.window(window).getScrollPosition();

                region.bottom = scrollPos.y + bottom;
                region.left = scrollPos.x + left;
                region.right = scrollPos.x + right;
                region.top = scrollPos.y + top;

                if (clientRects.length) {
                    var endRect = clientRects[clientRects.length - 1];
                    var startRect = clientRects[0];

                    region.endRect = {
                        bottom: scrollPos.y + endRect.bottom,
                        height: endRect.height,
                        left: scrollPos.x + endRect.left,
                        right: scrollPos.x + endRect.right,
                        top: scrollPos.y + endRect.top,
                        width: endRect.width
                    };

                    region.startRect = {
                        bottom: scrollPos.y + startRect.bottom,
                        height: startRect.height,
                        left: scrollPos.x + startRect.left,
                        right: scrollPos.x + startRect.right,
                        top: scrollPos.y + startRect.top,
                        width: startRect.width
                    };
                }
            }

            return region;
        },

        /**
         * Retrieves the direction of the selection. The direction is from top to bottom or from bottom to top.
         * For IE < 9 it is not possible, so the direction for these browsers will be always CKEDITOR.SELECTION_TOP_TO_BOTTOM.
         *
         * @method getSelectionDirection
         * @return {Number} Returns a number which represents selection direction. It might be one of these:
         * - CKEDITOR.SELECTION_TOP_TO_BOTTOM;
         * - CKEDITOR.SELECTION_BOTTOM_TO_TOP;
         */
        getSelectionDirection: function () {
            var direction = CKEDITOR.SELECTION_TOP_TO_BOTTOM;
            var selection = this.getSelection();
            var nativeSelection = selection.getNative();

            if (!nativeSelection) {
                return direction;
            }

            var anchorNode;

            if ((anchorNode = nativeSelection.anchorNode) && anchorNode.compareDocumentPosition) {
                var position = anchorNode.compareDocumentPosition(nativeSelection.focusNode);

                if (!position && nativeSelection.anchorOffset > nativeSelection.focusOffset || position === Node.DOCUMENT_POSITION_PRECEDING) {
                    direction = CKEDITOR.SELECTION_BOTTOM_TO_TOP;
                }
            }

            return direction;
        }
    };

    CKEDITOR.plugins.add('ae_selectionregion', {
        /**
         * Initializer lifecycle implementation for the SelectionRegion plugin.
         *
         * @method init
         * @protected
         * @param {Object} editor The current CKEditor instance.
         */
        init: function (editor) {
            var attr, hasOwnProperty;

            hasOwnProperty = Object.prototype.hasOwnProperty;

            for (attr in SelectionRegion.prototype) {
                if (hasOwnProperty.call(SelectionRegion.prototype, attr) && typeof editor[attr] === 'undefined') {
                    editor[attr] = SelectionRegion.prototype[attr];
                }
            }
        }
    });
})();
(function () {
    'use strict';

    var IE_NON_DIRECTLY_EDITABLE_ELEMENT = {
        'table': 1,
        'col': 1,
        'colgroup': 1,
        'tbody': 1,
        'td': 1,
        'tfoot': 1,
        'th': 1,
        'thead': 1,
        'tr': 1
    };

    /**
     * Table class utility. Provides methods for create, delete and update tables.
     *
     * @class CKEDITOR.Table
     * @constructor
     * @param {Object} editor The CKEditor instance.
     */

    function Table(editor) {
        this._editor = editor;
    }

    Table.HEADING_BOTH = 'Both';
    Table.HEADING_COL = 'Column';
    Table.HEADING_NONE = 'None';
    Table.HEADING_ROW = 'Row';

    Table.prototype = {
        constructor: Table,

        /**
         * Creates a table.
         *
         * @method create
         * @param {Object} config Table configuration object
         * @return {Object} The created table
         */
        create: function (config) {
            var editor = this._editor;
            var table = this._createElement('table');

            config = config || {};

            // Generate the rows and cols.
            var tbody = table.append(this._createElement('tbody'));
            var rows = config.rows || 1;
            var cols = config.cols || 1;

            for (var i = 0; i < rows; i++) {
                var row = tbody.append(this._createElement('tr'));
                for (var j = 0; j < cols; j++) {
                    var cell = row.append(this._createElement('td'));

                    cell.appendBogus();
                }
            }

            this.setAttributes(table, config.attrs);
            this.setHeading(table, config.heading);

            // Insert the table element if we're creating one.
            editor.insertElement(table);

            var firstCell = new CKEDITOR.dom.element(table.$.rows[0].cells[0]);
            var range = editor.createRange();
            range.moveToPosition(firstCell, CKEDITOR.POSITION_AFTER_START);
            range.select();

            return table;
        },

        /**
         * Retrieves a table from the current selection.
         *
         * @method getFromSelection
         * @return {CKEDITOR.dom.element} The retrieved table or null if not found.
         */
        getFromSelection: function () {
            var table;
            var selection = this._editor.getSelection();
            var selected = selection.getSelectedElement();

            if (selected && selected.is('table')) {
                table = selected;
            } else {
                var ranges = selection.getRanges();

                if (ranges.length > 0) {
                    // Webkit could report the following range on cell selection (#4948):
                    // <table><tr><td>[&nbsp;</td></tr></table>]

                    /* istanbul ignore else */
                    if (CKEDITOR.env.webkit) {
                        ranges[0].shrink(CKEDITOR.NODE_ELEMENT);
                    }

                    table = this._editor.elementPath(ranges[0].getCommonAncestor(true)).contains('table', 1);
                }
            }

            return table;
        },

        /**
         * Checks if a given table can be considered as editable. This method
         * workarounds a limitation of IE where for some elements (like table),
         * `isContentEditable` returns always false. This is because IE does not support
         * `contenteditable` on such elements. However, despite such elements
         * cannot be set as content editable directly, a content editable SPAN,
         * or DIV element can be placed inside the individual table cells.
         * See https://msdn.microsoft.com/en-us/library/ms537837%28v=VS.85%29.aspx
         *
         * @method isEditable
         * @param {CKEDITOR.dom.element} el The table element to test if editable
         * @return {Boolean}
         */
        isEditable: function (el) {
            if (!CKEDITOR.env.ie || !el.is(IE_NON_DIRECTLY_EDITABLE_ELEMENT)) {
                return !el.isReadOnly();
            }

            if (el.hasAttribute('contenteditable')) {
                return el.getAttribute('contenteditable') !== 'false';
            }

            return this.isEditable(el.getParent());
        },

        /**
         * Returns which heading style is set for the given table.
         *
         * @method getHeading
         * @param {CKEDITOR.dom.element} table The table to gather the heading from. If null, it will be retrieved from the current selection.
         * @return {String} The heading of the table. Expected values are `CKEDITOR.Table.NONE`, `CKEDITOR.Table.ROW`, `CKEDITOR.Table.COL` and `CKEDITOR.Table.BOTH`.
         */
        getHeading: function (table) {
            table = table || this.getFromSelection();

            if (!table) {
                return null;
            }

            var rowHeadingSettings = table.$.tHead !== null;

            var colHeadingSettings = true;

            // Check if all of the first cells in every row are TH
            for (var row = 0; row < table.$.rows.length; row++) {
                // If just one cell isn't a TH then it isn't a header column
                var cell = table.$.rows[row].cells[0];

                if (cell && cell.nodeName.toLowerCase() !== 'th') {
                    colHeadingSettings = false;
                    break;
                }
            }

            var headingSettings = Table.HEADING_NONE;

            if (rowHeadingSettings) {
                headingSettings = Table.HEADING_ROW;
            }

            if (colHeadingSettings) {
                headingSettings = headingSettings === Table.HEADING_ROW ? Table.HEADING_BOTH : Table.HEADING_COL;
            }

            return headingSettings;
        },

        /**
         * Removes a table from the editor.
         *
         * @method remove
         * @param {CKEDITOR.dom.element} table The table element which table style should be removed.
         */
        remove: function (table) {
            var editor = this._editor;

            if (table) {
                table.remove();
            } else {
                table = editor.elementPath().contains('table', 1);

                if (table) {
                    // If the table's parent has only one child remove it as well (unless it's a table cell, or the editable element) (#5416, #6289, #12110)
                    var parent = table.getParent();
                    var editable = editor.editable();

                    if (parent.getChildCount() === 1 && !parent.is('td', 'th') && !parent.equals(editable)) {
                        table = parent;
                    }

                    var range = editor.createRange();
                    range.moveToPosition(table, CKEDITOR.POSITION_BEFORE_START);
                    table.remove();
                    range.select();
                }
            }
        },

        /**
         * Assigns provided attributes to a table.
         *
         * @method setAttributes
         * @param {Object} table The table to which the attributes should be assigned
         * @param {Object} attrs The attributes which have to be assigned to the table
         */
        setAttributes: function (table, attrs) {
            if (attrs) {
                Object.keys(attrs).forEach(function (attr) {
                    table.setAttribute(attr, attrs[attr]);
                });
            }
        },

        /**
         * Sets the appropriate table heading style to a table.
         *
         * @method setHeading
         * @param {CKEDITOR.dom.element} table The table element to which the heading should be set. If null, it will be retrieved from the current selection.
         * @param {String} heading The table heading to be set. Accepted values are: `CKEDITOR.Table.NONE`, `CKEDITOR.Table.ROW`, `CKEDITOR.Table.COL` and `CKEDITOR.Table.BOTH`.
         */
        setHeading: function (table, heading) {
            table = table || this.getFromSelection();

            var i, newCell;
            var tableHead;
            var tableBody = table.getElementsByTag('tbody').getItem(0);

            var tableHeading = this.getHeading(table);
            var hadColHeading = tableHeading === Table.HEADING_COL || tableHeading === Table.HEADING_BOTH;

            var needColHeading = heading === Table.HEADING_COL || heading === Table.HEADING_BOTH;
            var needRowHeading = heading === Table.HEADING_ROW || heading === Table.HEADING_BOTH;

            // If we need row heading and don't have a <thead> element yet, move the
            // first row of the table to the head and convert the nodes to <th> ones.
            if (!table.$.tHead && needRowHeading) {
                var tableFirstRow = tableBody.getElementsByTag('tr').getItem(0);
                var tableFirstRowChildCount = tableFirstRow.getChildCount();

                // Change TD to TH:
                for (i = 0; i < tableFirstRowChildCount; i++) {
                    var cell = tableFirstRow.getChild(i);

                    // Skip bookmark nodes. (#6155)
                    if (cell.type === CKEDITOR.NODE_ELEMENT && !cell.data('cke-bookmark')) {
                        cell.renameNode('th');
                        cell.setAttribute('scope', 'col');
                    }
                }

                tableHead = this._createElement(table.$.createTHead());
                tableHead.append(tableFirstRow.remove());
            }

            // If we don't need row heading and we have a <thead> element, move the
            // row out of there and into the <tbody> element.
            if (table.$.tHead !== null && !needRowHeading) {
                // Move the row out of the THead and put it in the TBody:
                tableHead = this._createElement(table.$.tHead);

                var previousFirstRow = tableBody.getFirst();

                while (tableHead.getChildCount() > 0) {
                    var newFirstRow = tableHead.getFirst();
                    var newFirstRowChildCount = newFirstRow.getChildCount();

                    for (i = 0; i < newFirstRowChildCount; i++) {
                        newCell = newFirstRow.getChild(i);

                        if (newCell.type === CKEDITOR.NODE_ELEMENT) {
                            newCell.renameNode('td');
                            newCell.removeAttribute('scope');
                        }
                    }

                    newFirstRow.insertBefore(previousFirstRow);
                }

                tableHead.remove();
            }

            tableHeading = this.getHeading(table);
            var hasColHeading = tableHeading === Table.HEADING_COL || tableHeading === Table.HEADING_BOTH;

            // If we need column heading and the table doesn't have it, convert every first cell in
            // every row into a `<th scope="row">` element.
            if (!hasColHeading && needColHeading) {
                for (i = 0; i < table.$.rows.length; i++) {
                    if (table.$.rows[i].cells[0].nodeName.toLowerCase() !== 'th') {
                        newCell = new CKEDITOR.dom.element(table.$.rows[i].cells[0]);
                        newCell.renameNode('th');
                        newCell.setAttribute('scope', 'row');
                    }
                }
            }

            // If we don't need column heading but the table has it, convert every first cell in every
            // row back into a `<td>` element.
            if (hadColHeading && !needColHeading) {
                for (i = 0; i < table.$.rows.length; i++) {
                    var row = new CKEDITOR.dom.element(table.$.rows[i]);

                    if (row.getParent().getName() === 'tbody') {
                        newCell = new CKEDITOR.dom.element(row.$.cells[0]);
                        newCell.renameNode('td');
                        newCell.removeAttribute('scope');
                    }
                }
            }
        },

        /**
         * Creates a new CKEDITOR.dom.element using the passed tag name.
         *
         * @protected
         * @method _createElement
         * @param {String} name The tag name from which an element should be created
         * @return {CKEDITOR.dom.element} Instance of CKEDITOR DOM element class
         */
        _createElement: function (name) {
            return new CKEDITOR.dom.element(name, this._editor.document);
        }
    };

    CKEDITOR.on('instanceReady', function (event) {
        var headingCommands = [Table.HEADING_NONE, Table.HEADING_ROW, Table.HEADING_COL, Table.HEADING_BOTH];

        var tableUtils = new Table(event.editor);

        headingCommands.forEach(function (heading) {
            event.editor.addCommand('tableHeading' + heading, {
                exec: function (editor) {
                    tableUtils.setHeading(null, heading);
                }
            });
        });
    });

    CKEDITOR.Table = CKEDITOR.Table || Table;
})();
(function () {
    'use strict';

    /**
     * CKEDITOR.tools class utility which adds additional methods to those of CKEditor.
     *
     * @class CKEDITOR.tools
     */

    /**
     * Returns a new object containing all of the properties of all the supplied
     * objects. The properties from later objects will overwrite those in earlier
     * objects.
     *
     * Passing in a single object will create a shallow copy of it.
     *
     * @static
     * @method merge
     * @param {Object} objects* One or more objects to merge.
     * @return {Object} A new merged object.
     */

    CKEDITOR.tools.merge = CKEDITOR.tools.merge || function () {
        var result = {};

        for (var i = 0; i < arguments.length; ++i) {
            var obj = arguments[i];

            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    result[key] = obj[key];
                }
            }
        }

        return result;
    };

    /**
     * Simulates event on a DOM element.
     *
     * @static
     * @method simulate
     * @param {DOMElement} element The element on which the event shoud be simualted.
     * @param {String} event The name of the event which have to be simulated.
     */
    CKEDITOR.tools.simulate = function (element, event) {
        var eventInstance = document.createEvent('Events');
        eventInstance.initEvent(event, true, false);
        element.dispatchEvent(eventInstance);
    };
})();
(function () {
    'use strict';

    if (CKEDITOR.plugins.get('ae_uicore')) {
        return;
    }

    /**
     * UICore class which will handle user interactions with the editor. These interactions
     * might be triggered via mouse, keyboard or touch devices. The class fill fire an event via
     * CKEditor's event system - "editorInteraction". The UI may listen to this event and
     * execute some actions - for example to show/hide toolbars.
     *
     * By default if user presses the Esc key, 'editorInteraction' event won't be fired. However, this behaviour can be changed
     * by setting {{#crossLink "CKEDITOR.plugins.ae_uicore/allowEsc:attribute"}}{{/crossLink}} config property in editor's configuration to true.
     *
     * @class CKEDITOR.plugins.ae_uicore
     */

    /**
     * Fired when user interacts somehow with the browser. This may be clicking with the mouse, pressing keyboard button,
     * or touching screen. This even will be not fired after each interaction. It will be debounced. By default the timeout
     * is 50ms. This value can be overwritten via {{#crossLink "CKEDITOR.plugins.ae_uicore/timeout:attribute"}}{{/crossLink}}
     * property of editor's configuration, like: editor.config.uicore.timeout = 100
     *
     * @event editorInteraction
     * @param {Object} data An object which contains the following properties:
     * - nativeEvent - The event as received from CKEditor.
     * - selectionData - The data, returned from {{#crossLink "CKEDITOR.plugins.ae_selectionregion/getSelectionData:method"}}{{/crossLink}}
     */

    /**
     * Fired by UI elements like Toolbars or Buttons when their state changes. The listener updates the live region with the provided data.
     *
     * @event ariaUpdate
     * @param {Object} data An object which contains the following properties:
     * - message - The provided message from the UI element.
     */

    /**
     * If set to true, the editor will still fire {{#crossLink "CKEDITOR.plugins.ae_uicore/editorInteraction:event"}}{{/crossLink}} event,
     * if user presses Esc key.
     *
     * @attribute allowEsc
     * @default false
     * @type Boolean
     */

    /**
     * Specifies the default timeout after which the {{#crossLink "CKEDITOR.plugins.ae_uicore/editorInteraction:event"}}{{/crossLink}} event
     * will be fired.
     *
     * @attribute timeout
     * @default 50 (ms)
     * @type Number
     */

    CKEDITOR.plugins.add('ae_uicore', {
        /**
         * Initializer lifecycle implementation for the UICore plugin.
         *
         * @protected
         * @method init
         * @param {Object} editor The current CKEditor instance.
         */
        init: function (editor) {
            var ariaState = [];

            var ariaElement = this._createAriaElement(editor.id);

            var uiTasksTimeout = editor.config.uicore ? editor.config.uicore.timeout : 50;

            var handleAria = CKEDITOR.tools.debounce(function (event) {
                ariaElement.innerHTML = ariaState.join('. ');
            }, uiTasksTimeout);

            var handleUI = CKEDITOR.tools.debounce(function (event) {
                ariaState = [];

                if (event.name !== 'keyup' || event.data.$.keyCode !== 27 || editor.config.allowEsc) {
                    var selectionData = editor.getSelectionData();

                    if (selectionData) {
                        editor.fire('editorInteraction', {
                            nativeEvent: event.data.$,
                            selectionData: selectionData
                        });
                    }
                }
            }, uiTasksTimeout);

            editor.on('ariaUpdate', function (event) {
                // handleAria is debounced function, so if it is being called multiple times, it will
                // be canceled until some time passes.
                // For that reason here we explicitly append the current message to the list of messages
                // and call handleAria. Since it is debounced, when some timeout passes,
                // all the messages will be applied to the live region and not only the last one.

                ariaState.push(event.data.message);

                handleAria();
            });

            editor.once('contentDom', function () {
                var editable = editor.editable();

                editable.attachListener(editable, 'mouseup', handleUI);
                editable.attachListener(editable, 'keyup', handleUI);
            });

            editor.on('destroy', function (event) {
                ariaElement.parentNode.removeChild(ariaElement);

                handleUI.detach();
            });
        },

        /**
         * Creates and applies an HTML element to the body of the document which will contain ARIA messages.
         *
         * @protected
         * @method _createAriaElement
         * @param {String} id The provided id of the element. It will be used as prefix for the final element Id.
         * @return {HTMLElement} The created and applied to DOM element.
         */
        _createAriaElement: function (id) {
            var statusElement = document.createElement('div');

            statusElement.className = 'ae-sr-only';

            statusElement.setAttribute('aria-live', 'polite');
            statusElement.setAttribute('role', 'status');
            statusElement.setAttribute('id', id + 'LiveRegion');

            document.body.appendChild(statusElement);

            return statusElement;
        }
    });
})();
(function () {
    'use strict';

    var isIE = CKEDITOR.env.ie;

    if (CKEDITOR.plugins.get('ae_addimages')) {
        return;
    }

    /**
     * CKEditor plugin which allows Drag&Drop of images directly into the editable area. The image will be encoded
     * as Data URI. An event `imageAdd` will be fired with the inserted element into the editable area.
     *
     * @class CKEDITOR.plugins.ae_addimages
     */

    /**
     * Fired when an image is being added to the editor successfully.
     *
     * @event imageAdd
     * @param {CKEDITOR.dom.element} el The created image with src as Data URI
     */

    CKEDITOR.plugins.add('ae_addimages', {
        /**
         * Initialization of the plugin, part of CKEditor plugin lifecycle.
         * The function registers a 'dragenter', 'dragover', 'drop' and `paste` events on the editing area.
         *
         * @method init
         * @param {Object} editor The current editor instance
         */
        init: function (editor) {
            editor.once('contentDom', (function () {
                var editable = editor.editable();

                editable.attachListener(editable, 'dragenter', this._onDragEnter, this, {
                    editor: editor
                });

                editable.attachListener(editable, 'dragover', this._onDragOver, this, {
                    editor: editor
                });

                editable.attachListener(editable, 'drop', this._onDragDrop, this, {
                    editor: editor
                });

                editable.attachListener(editable, 'paste', this._onPaste, this, {
                    editor: editor
                });
            }).bind(this));
        },

        /**
         * Accepts an array of dropped files to the editor. Then, it filters the images and sends them for further
         * processing to {{#crossLink "CKEDITOR.plugins.ae_addimages/_processFile:method"}}{{/crossLink}}
         *
         * @protected
         * @method _handleFiles
         * @param {Array} files Array of dropped files. Only the images from this list will be processed.
         * @param {Object} editor The current editor instance
         */
        _handleFiles: function (files, editor) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                if (file.type.indexOf('image') === 0) {
                    this._processFile(file, editor);
                }
            }

            return false;
        },

        /**
         * Handles drag enter event. In case of IE, this function will prevent the event.
         *
         * @protected
         * @method _onDragEnter
         * @param {DOM event} event dragenter event, as received natively from CKEditor
         */
        _onDragEnter: function (event) {
            if (isIE) {
                this._preventEvent(event);
            }
        },

        /**
         * Handles drag over event. In case of IE, this function will prevent the event.
         *
         * @protected
         * @method _onDragOver
         * @param {DOM event} event dragover event, as received natively from CKEditor
         */
        _onDragOver: function (event) {
            if (isIE) {
                this._preventEvent(event);
            }
        },

        /**
         * Handles drag drop event. The function will create selection from the current points and
         * will send a list of files to be processed to
         * {{#crossLink "CKEDITOR.plugins.ae_addimages/_handleFiles:method"}}{{/crossLink}}
         *
         * @protected
         * @method _onDragDrop
         * @param {CKEDITOR.dom.event} event dragdrop event, as received natively from CKEditor
         */
        _onDragDrop: function (event) {
            var nativeEvent = event.data.$;

            new CKEDITOR.dom.event(nativeEvent).preventDefault();

            var editor = event.listenerData.editor;

            event.listenerData.editor.createSelectionFromPoint(nativeEvent.clientX, nativeEvent.clientY);

            this._handleFiles(nativeEvent.dataTransfer.files, editor);
        },

        /**
         * Checks if the pasted data is image and passes it to
         * {{#crossLink "CKEDITOR.plugins.ae_addimages/_processFile:method"}}{{/crossLink}} for processing.
         *
         * @method _onPaste
         * @protected
         * @param {CKEDITOR.dom.event} event A `paste` event, as received natively from CKEditor
         */
        _onPaste: function (event) {
            if (event.data.$.clipboardData) {
                var pastedData = event.data.$.clipboardData.items[0];

                if (pastedData.type.indexOf('image') === 0) {
                    var imageFile = pastedData.getAsFile();

                    this._processFile(imageFile, event.listenerData.editor);
                }
            }
        },

        /**
         * Prevents a native event.
         *
         * @protected
         * @method _preventEvent
         * @param {DOM event} event The event to be prevented.
         */
        _preventEvent: function (event) {
            event = new CKEDITOR.dom.event(event.data.$);

            event.preventDefault();
            event.stopPropagation();
        },

        /**
         * Processes an image file. The function creates an img element and sets as source
         * a Data URI, then fires an 'imageAdd' event via CKEditor's event system.
         *
         * @protected
         * @method _preventEvent
         * @param {DOM event} event The event to be prevented.
         */
        _processFile: function (file, editor) {
            var reader = new FileReader();

            reader.addEventListener('loadend', function () {
                var bin = reader.result;

                var el = CKEDITOR.dom.element.createFromHtml('<img src="' + bin + '">');

                editor.insertElement(el);

                var imageData = {
                    el: el,
                    file: file
                };

                editor.fire('imageAdd', imageData);
            });

            reader.readAsDataURL(file);
        }
    });
})();
(function () {
    'use strict';

    if (CKEDITOR.plugins.get('ae_autolink')) {
        return;
    }

    // Disables the auto URL detection feature in IE, their lacks functionality:
    // They convert the links only on space. We do on space, comma, semicolon and Enter.
    if (/MSIE ([^;]*)|Trident.*; rv:([0-9.]+)/.test(navigator.userAgent)) {
        document.execCommand('AutoUrlDetect', false, false);
    }

    var KEY_BACK = 8;

    var KEY_COMMA = 188;

    var KEY_ENTER = 13;

    var KEY_SEMICOLON = 186;

    var KEY_SPACE = 32;

    var DELIMITERS = [KEY_COMMA, KEY_ENTER, KEY_SEMICOLON, KEY_SPACE];

    var REGEX_LAST_WORD = /[^\s]+/mg;

    var REGEX_URL = /(https?\:\/\/|www\.)(-\.)?([^\s/?\.#-]+\.?)+(\/[^\s]*)?$/i;

    /**
     * CKEditor plugin which automatically generates links when user types text which looks like URL.
     *
     * @class CKEDITOR.plugins.ae_autolink
     * @constructor
     */
    CKEDITOR.plugins.add('ae_autolink', {

        /**
         * Initialization of the plugin, part of CKEditor plugin lifecycle.
         * The function registers the `keyup` event on the editing area.
         *
         * @method init
         * @param {Object} editor The current editor instance
         */
        init: function (editor) {
            editor.once('contentDom', (function () {
                var editable = editor.editable();

                editable.attachListener(editable, 'keyup', this._onKeyUp, this, {
                    editor: editor
                });
            }).bind(this));
        },

        /**
         * Retrieves the last word introduced by the user. Reads from the current
         * caret position backwards until it finds the first white space.
         *
         * @protected
         * @method _getLastWord
         * @return {String} The last word introduced by user
         */
        _getLastWord: function (editor) {
            var range = editor.getSelection().getRanges()[0];

            var offset = range.startOffset;

            var previousText = '';

            // The user pressed Enter, so we have to look on the previous node
            if (this._currentKeyCode === KEY_ENTER) {
                var previousNode = range.startContainer.getPrevious();

                var lastChild;

                if (previousNode) {
                    // If previous node is a SPACE, (it does not have 'getLast' method),
                    // ignore it and find the previous text node
                    while (!previousNode.getLast) {
                        previousNode = previousNode.getPrevious();
                    }

                    lastChild = previousNode.getLast();

                    // Depending on the browser, the last child node may be a <BR>
                    // (which does not have 'getText' method),
                    // so ignore it and find the previous text node
                    while (lastChild && !lastChild.getText()) {
                        lastChild = lastChild.getPrevious();
                    }
                }

                // Check if the lastChild is already a link
                if (!(lastChild && lastChild.$.href)) {
                    this._startContainer = lastChild;
                    previousText = lastChild ? lastChild.getText() : '';
                    this._offset = previousText.length;
                }
            } else {
                this._startContainer = range.startContainer;

                // Last character is the delimiter, ignore it
                previousText = this._startContainer.getText().substring(0, offset - 1);

                this._offset = offset - 1;
            }

            var lastWord = '';

            var match = previousText.match(REGEX_LAST_WORD);

            if (match) {
                lastWord = match.pop();
            }

            return lastWord;
        },

        /**
         * Checks if the given link is a valid URL.
         *
         * @protected
         * @method isValidURL
         * @param {String} link The link we want to know if it is a valid URL
         * @return {Boolean} Returns true if the link is a valid URL, false otherwise
         */
        _isValidURL: function (link) {
            return REGEX_URL.test(link);
        },

        /**
         * Listens to the `keydown` event and if the keycode is `Backspace`, removes the previously
         * created link.
         *
         * @protected
         * @method _onKeyDown
         * @param {EventFacade} event EventFacade object
         */
        _onKeyDown: function (event) {
            var nativeEvent = event.data.$;

            var editor = event.listenerData.editor;

            var editable = editor.editable();

            editable.removeListener('keydown', this._onKeyDown);

            if (nativeEvent.keyCode === KEY_BACK) {
                event.cancel();
                event.data.preventDefault();

                this._removeLink(editor);
            }

            this._ckLink = null;
        },

        /**
         * Listens to the `Enter` and `Space` key events in order to check if the last word
         * introduced by the user should be replaced by a link element.
         *
         * @protected
         * @method _onKeyUp
         * @param {EventFacade} event EventFacade object
         */
        _onKeyUp: function (event) {
            var nativeEvent = event.data.$;

            this._currentKeyCode = nativeEvent.keyCode;

            if (DELIMITERS.indexOf(this._currentKeyCode) !== -1) {
                var editor = event.listenerData.editor;

                var lastWord = this._getLastWord(editor);

                if (this._isValidURL(lastWord)) {
                    this._replaceContentByLink(editor, lastWord);
                }
            }
        },

        /**
         * Replaces content by a link element.
         *
         * @protected
         * @method _replaceContentByLink
         * @param {String} content The text that has to be replaced by an link element
         */
        _replaceContentByLink: function (editor, content) {
            var range = editor.createRange();
            var node = CKEDITOR.dom.element.get(this._startContainer);
            var offset = this._offset;

            // Select the content, so CKEDITOR.Link can properly replace it
            range.setStart(node, offset - content.length);
            range.setEnd(node, offset);
            range.select();

            var ckLink = new CKEDITOR.Link(editor);
            ckLink.create(content);
            this._ckLink = ckLink;

            var linkNode = this._startContainer.getNext() || this._startContainer;
            editor.fire('autolinkAdd', linkNode.getParent());

            this._subscribeToKeyEvent(editor);

            // Now range is on the link and it is selected. We have to
            // return focus to the caret position.
            range = editor.getSelection().getRanges()[0];

            // If user pressed `Enter`, get the next editable node at position 0,
            // otherwise set the cursor at the next character of the link (the white space)
            if (this._currentKeyCode === KEY_ENTER) {
                var nextEditableNode = range.getNextEditableNode();

                range.setStart(nextEditableNode, 0);
                range.setEnd(nextEditableNode, 0);
            } else {
                var nextNode = range.getNextNode();

                range.setStart(nextNode, 1);
                range.setEnd(nextNode, 1);
            }

            range.select();
        },

        /**
         * Fired when a URL is detected in text and converted to a link.
         *
         * @event autolinkAdd
         * @param {CKEDITOR.dom.element} el Node of the created link.
         */

        /**
         * Removes the created link element, and replaces it by its text.
         *
         * @protected
         * @method _removeLink
         */
        _removeLink: function (editor) {
            var range = editor.getSelection().getRanges()[0];
            var caretOffset = range.startOffset;

            // Select the link, so CKEDITOR.Link can properly remove it
            var linkNode = this._startContainer.getNext() || this._startContainer;

            var newRange = editor.createRange();
            newRange.setStart(linkNode, 0);
            newRange.setEndAfter(linkNode);
            newRange.select();

            this._ckLink.remove();

            // Return focus to the caret position
            range.setEnd(range.startContainer, caretOffset);
            range.setStart(range.startContainer, caretOffset);

            range.select();
        },

        /**
         * Subscribe to a key event of the editable aria.
         *
         * @protected
         * @method _subscribeToKeyEvent
         */
        _subscribeToKeyEvent: function (editor) {
            var editable = editor.editable();

            // Change the priority of keydown listener - 1 means the highest priority.
            // In Chrome on pressing `Enter` the listener is not being invoked.
            // See http://dev.ckeditor.com/ticket/11861 for more information.
            editable.attachListener(editable, 'keydown', this._onKeyDown, this, {
                editor: editor
            }, 1);
        }
    });
})();
/**
 * CKEditor plugin: Dragable image resizing
 * https://github.com/sstur/ck-dragresize
 * - Shows semi-transparent overlay while resizing
 * - Enforces Aspect Ratio (unless holding shift)
 * - Snap to size of other images in editor
 * - Escape while dragging cancels resize
 */
(function () {
    'use strict';

    if (CKEDITOR.plugins.get('ae_dragresize')) {
        return;
    }

    var IMAGE_SNAP_TO_SIZE = 7;

    var isWebkit = 'WebkitAppearance' in document.documentElement.style;

    if (isWebkit) {
        // CSS is added in a compressed form
        CKEDITOR.addCss('img::selection{color:rgba(0,0,0,0)}img.ckimgrsz{outline:1px dashed #000}#ckimgrsz{position:absolute;width:0;height:0;cursor:default;z-index:10001}#ckimgrsz span{display:none;position:absolute;top:0;left:0;width:0;height:0;background-size:100% 100%;opacity:.65;outline:1px dashed #000}#ckimgrsz i{position:absolute;display:block;width:5px;height:5px;background:#fff;border:1px solid #000}#ckimgrsz i.active,#ckimgrsz i:hover{background:#000}#ckimgrsz i.br,#ckimgrsz i.tl{cursor:nwse-resize}#ckimgrsz i.bm,#ckimgrsz i.tm{cursor:ns-resize}#ckimgrsz i.bl,#ckimgrsz i.tr{cursor:nesw-resize}#ckimgrsz i.lm,#ckimgrsz i.rm{cursor:ew-resize}body.dragging-br,body.dragging-br *,body.dragging-tl,body.dragging-tl *{cursor:nwse-resize!important}body.dragging-bm,body.dragging-bm *,body.dragging-tm,body.dragging-tm *{cursor:ns-resize!important}body.dragging-bl,body.dragging-bl *,body.dragging-tr,body.dragging-tr *{cursor:nesw-resize!important}body.dragging-lm,body.dragging-lm *,body.dragging-rm,body.dragging-rm *{cursor:ew-resize!important}');
    }

    /**
     * Initializes the plugin
     */
    CKEDITOR.plugins.add('ae_dragresize', {
        onLoad: function () {
            if (!isWebkit) {
                return;
            }
        },
        init: function (editor) {
            if (!isWebkit) {
                return;
            }

            editor.once('contentDom', function (evt) {
                init(editor);
            });
        }
    });

    function init(editor) {
        var window = editor.window.$,
            document = editor.document.$;
        var snapToSize = typeof IMAGE_SNAP_TO_SIZE === 'undefined' ? null : IMAGE_SNAP_TO_SIZE;

        var resizer = new Resizer(editor, {
            snapToSize: snapToSize
        });

        document.addEventListener('mousedown', function (e) {
            if (resizer.isHandle(e.target)) {
                resizer.initDrag(e);
            }
        }, false);

        function selectionChange() {
            var selection = editor.getSelection();
            if (!selection) return;
            // If an element is selected and that element is an IMG
            if (selection.getType() !== CKEDITOR.SELECTION_NONE && selection.getStartElement().is('img')) {
                // And we're not right or middle clicking on the image
                if (!window.event || !window.event.button || window.event.button === 0) {
                    resizer.show(selection.getStartElement().$);
                }
            } else {
                resizer.hide();
            }
        }

        editor.on('selectionChange', selectionChange);

        editor.on('getData', function (e) {
            var html = e.data.dataValue || '';
            html = html.replace(/<div id="ckimgrsz"([\s\S]*?)<\/div>/i, '');
            html = html.replace(/\b(ckimgrsz)\b/g, '');
            e.data.dataValue = html;
        });

        editor.on('beforeUndoImage', function () {
            // Remove the handles before undo images are saved
            resizer.hide();
        });

        editor.on('afterUndoImage', function () {
            // Restore the handles after undo images are saved
            selectionChange();
        });

        editor.on('blur', function () {
            // Remove the handles when editor loses focus
            resizer.hide();
        });

        editor.on('beforeModeUnload', function self() {
            editor.removeListener('beforeModeUnload', self);
            resizer.hide();
        });

        // Update the selection when the browser window is resized
        var resizeTimeout;
        editor.window.on('resize', function () {
            // Cancel any resize waiting to happen
            clearTimeout(resizeTimeout);
            // Delay resize to "debounce"
            resizeTimeout = setTimeout(selectionChange, 50);
        });
    }

    function Resizer(editor, cfg) {
        this.editor = editor;
        this.window = editor.window.$;
        this.document = editor.document.$;
        this.cfg = cfg || {};
        this.init();
    }

    Resizer.prototype = {
        init: function () {
            var container = this.container = this.document.createElement('div');
            container.id = 'ckimgrsz';
            this.preview = this.document.createElement('span');
            container.appendChild(this.preview);
            var handles = this.handles = {
                tl: this.createHandle('tl'),
                tm: this.createHandle('tm'),
                tr: this.createHandle('tr'),
                lm: this.createHandle('lm'),
                rm: this.createHandle('rm'),
                bl: this.createHandle('bl'),
                bm: this.createHandle('bm'),
                br: this.createHandle('br')
            };
            for (var n in handles) {
                container.appendChild(handles[n]);
            }
        },
        createHandle: function (name) {
            var el = this.document.createElement('i');
            el.classList.add(name);
            return el;
        },
        isHandle: function (el) {
            var handles = this.handles;
            for (var n in handles) {
                if (handles[n] === el) return true;
            }
            return false;
        },
        show: function (el) {
            this.el = el;
            if (this.cfg.snapToSize) {
                this.otherImages = toArray(this.document.getElementsByTagName('img'));
                this.otherImages.splice(this.otherImages.indexOf(el), 1);
            }
            var box = this.box = getBoundingBox(this.window, el);
            positionElement(this.container, box.left, box.top);
            this.document.body.appendChild(this.container);
            this.el.classList.add('ckimgrsz');
            this.showHandles();
        },
        hide: function () {
            // Remove class from all img.ckimgrsz
            var elements = this.document.getElementsByClassName('ckimgrsz');
            for (var i = 0; i < elements.length; ++i) {
                elements[i].classList.remove('ckimgrsz');
            }
            this.hideHandles();
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
        },
        initDrag: function (e) {
            if (e.button !== 0) {
                //right-click or middle-click
                return;
            }
            var resizer = this;
            var drag = new DragEvent(this.window, this.document);
            drag.onStart = function () {
                resizer.showPreview();
                resizer.isDragging = true;
                resizer.editor.getSelection().lock();
            };
            drag.onDrag = function () {
                resizer.calculateSize(this);
                resizer.updatePreview();
                var box = resizer.previewBox;
                resizer.updateHandles(box, box.left, box.top);
            };
            drag.onRelease = function () {
                resizer.isDragging = false;
                resizer.hidePreview();
                resizer.hide();
                resizer.editor.getSelection().unlock();
                // Save an undo snapshot before the image is permanently changed
                resizer.editor.fire('saveSnapshot');
            };
            drag.onComplete = function () {
                resizer.resizeComplete();
                // Save another snapshot after the image is changed
                resizer.editor.fire('saveSnapshot');
            };
            drag.start(e);
        },
        updateHandles: function (box, left, top) {
            left = left || 0;
            top = top || 0;
            var handles = this.handles;
            positionElement(handles.tl, -3 + left, -3 + top);
            positionElement(handles.tm, Math.round(box.width / 2) - 3 + left, -3 + top);
            positionElement(handles.tr, box.width - 4 + left, -3 + top);
            positionElement(handles.lm, -3 + left, Math.round(box.height / 2) - 3 + top);
            positionElement(handles.rm, box.width - 4 + left, Math.round(box.height / 2) - 3 + top);
            positionElement(handles.bl, -3 + left, box.height - 4 + top);
            positionElement(handles.bm, Math.round(box.width / 2) - 3 + left, box.height - 4 + top);
            positionElement(handles.br, box.width - 4 + left, box.height - 4 + top);
        },
        showHandles: function () {
            var handles = this.handles;
            this.updateHandles(this.box);
            for (var n in handles) {
                handles[n].style.display = 'block';
            }
        },
        hideHandles: function () {
            var handles = this.handles;
            for (var n in handles) {
                handles[n].style.display = 'none';
            }
        },
        showPreview: function () {
            this.preview.style.backgroundImage = 'url("' + this.el.src + '")';
            this.calculateSize();
            this.updatePreview();
            this.preview.style.display = 'block';
        },
        updatePreview: function () {
            var box = this.previewBox;
            positionElement(this.preview, box.left, box.top);
            resizeElement(this.preview, box.width, box.height);
        },
        hidePreview: function () {
            var box = getBoundingBox(this.window, this.preview);
            this.result = {
                width: box.width,
                height: box.height
            };
            this.preview.style.display = 'none';
        },
        calculateSize: function (data) {
            var box = this.previewBox = {
                top: 0,
                left: 0,
                width: this.box.width,
                height: this.box.height
            };
            if (!data) return;
            var attr = data.target.className;
            if (~attr.indexOf('r')) {
                box.width = Math.max(32, this.box.width + data.delta.x);
            }
            if (~attr.indexOf('b')) {
                box.height = Math.max(32, this.box.height + data.delta.y);
            }
            if (~attr.indexOf('l')) {
                box.width = Math.max(32, this.box.width - data.delta.x);
            }
            if (~attr.indexOf('t')) {
                box.height = Math.max(32, this.box.height - data.delta.y);
            }
            //if dragging corner, enforce aspect ratio (unless shift key is being held)
            if (attr.indexOf('m') < 0 && !data.keys.shift) {
                var ratio = this.box.width / this.box.height;
                if (box.width / box.height > ratio) {
                    box.height = Math.round(box.width / ratio);
                } else {
                    box.width = Math.round(box.height * ratio);
                }
            }
            var snapToSize = this.cfg.snapToSize;
            if (snapToSize) {
                var others = this.otherImages;
                for (var i = 0; i < others.length; i++) {
                    var other = getBoundingBox(this.window, others[i]);
                    if (Math.abs(box.width - other.width) <= snapToSize && Math.abs(box.height - other.height) <= snapToSize) {
                        box.width = other.width;
                        box.height = other.height;
                        break;
                    }
                }
            }
            //recalculate left or top position
            if (~attr.indexOf('l')) {
                box.left = this.box.width - box.width;
            }
            if (~attr.indexOf('t')) {
                box.top = this.box.height - box.height;
            }
        },
        resizeComplete: function () {
            resizeElement(this.el, this.result.width, this.result.height);
        }
    };

    function DragEvent(window, document) {
        this.window = window;
        this.document = document;
        this.events = {
            mousemove: bind(this.mousemove, this),
            keydown: bind(this.keydown, this),
            mouseup: bind(this.mouseup, this)
        };
    }

    DragEvent.prototype = {
        start: function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.target = e.target;
            this.attr = e.target.className;
            this.startPos = {
                x: e.clientX,
                y: e.clientY
            };
            this.update(e);
            var events = this.events;
            this.document.addEventListener('mousemove', events.mousemove, false);
            this.document.addEventListener('keydown', events.keydown, false);
            this.document.addEventListener('mouseup', events.mouseup, false);
            this.document.body.classList.add('dragging-' + this.attr);
            this.onStart && this.onStart();
        },
        update: function (e) {
            this.currentPos = {
                x: e.clientX,
                y: e.clientY
            };
            this.delta = {
                x: e.clientX - this.startPos.x,
                y: e.clientY - this.startPos.y
            };
            this.keys = {
                shift: e.shiftKey,
                ctrl: e.ctrlKey,
                alt: e.altKey
            };
        },
        mousemove: function (e) {
            this.update(e);
            this.onDrag && this.onDrag();
            if (e.which === 0) {
                //mouse button released outside window; mouseup wasn't fired (Chrome)
                this.mouseup(e);
            }
        },
        keydown: function (e) {
            //escape key cancels dragging
            if (e.keyCode === 27) {
                this.release();
            }
        },
        mouseup: function (e) {
            this.update(e);
            this.release();
            this.onComplete && this.onComplete();
        },
        release: function () {
            this.document.body.classList.remove('dragging-' + this.attr);
            var events = this.events;
            this.document.removeEventListener('mousemove', events.mousemove, false);
            this.document.removeEventListener('keydown', events.keydown, false);
            this.document.removeEventListener('mouseup', events.mouseup, false);
            this.onRelease && this.onRelease();
        }
    };

    //helper functions
    function toArray(obj) {
        var len = obj.length,
            arr = new Array(len);
        for (var i = 0; i < len; i++) {
            arr[i] = obj[i];
        }
        return arr;
    }

    function bind(fn, ctx) {
        if (fn.bind) {
            return fn.bind(ctx);
        }
        return function () {
            fn.apply(ctx, arguments);
        };
    }

    function positionElement(el, left, top) {
        el.style.left = String(left) + 'px';
        el.style.top = String(top) + 'px';
    }

    function resizeElement(el, width, height) {
        el.style.width = String(width) + 'px';
        el.style.height = String(height) + 'px';
    }

    function getBoundingBox(window, el) {
        var rect = el.getBoundingClientRect();
        return {
            left: rect.left + window.pageXOffset,
            top: rect.top + window.pageYOffset,
            width: rect.width,
            height: rect.height
        };
    }
})();
(function () {
    'use strict';

    if (CKEDITOR.plugins.get('ae_pasteimages')) {
        return;
    }

    /**
     * CKEditor plugin which allows pasting images directly into the editable area. The image will be encoded
     * as Data URI. An event `imageAdd` will be fired with the inserted element into the editable area.
     *
     * @class CKEDITOR.plugins.ae_pasteimages
     */

    /**
     * Fired when an image is being added to the editor successfully.
     *
     * @event imageAdd
     * @param {CKEDITOR.dom.element} el The created image with src as Data URI
     */

    CKEDITOR.plugins.add('ae_pasteimages', {
        /**
         * Initialization of the plugin, part of CKEditor plugin lifecycle.
         * The function registers a 'paste' event on the editing area.
         *
         * @method init
         * @param {Object} editor The current editor instance
         */
        init: function (editor) {
            editor.once('contentDom', (function () {
                var editable = editor.editable();

                editable.attachListener(editable, 'paste', this._onPaste, this, {
                    editor: editor
                });
            }).bind(this));
        },

        /**
         * The function creates an img element with src the image data as Data URI.
         * Then, it fires an 'imageAdd' event via CKEditor's event system. The passed
         * params will be:
         * - `el` - the created img element
         * - `file` - the original pasted data
         *
         * @method _onPaste
         * @protected
         * @param {CKEDITOR.dom.event} event A `paste` event, as received natively from CKEditor
         */
        _onPaste: function (event) {
            if (event.data.$.clipboardData) {
                var pastedData = event.data.$.clipboardData.items[0];
                var editor = event.listenerData.editor;

                if (pastedData.type.indexOf('image') === 0) {
                    var reader = new FileReader();
                    var imageFile = pastedData.getAsFile();

                    reader.onload = (function (event) {
                        var el = CKEDITOR.dom.element.createFromHtml('<img src="' + event.target.result + '">');

                        editor.insertElement(el);

                        var imageData = {
                            el: el,
                            file: imageFile
                        };

                        editor.fire('imageAdd', imageData);
                    }).bind(this);

                    reader.readAsDataURL(imageFile);
                }
            }
        }
    });
})();
(function () {
    'use strict';

    if (CKEDITOR.plugins.get('ae_placeholder')) {
        return;
    }

    /**
     * CKEditor plugin which allows adding a placeholder to the editor. In this case, if there
     * is no content to the editor, there will be hint to the user.
     *
     * @class CKEDITOR.plugins.ae_placeholder
     */

    /**
     * Specifies the placeholder class which have to be aded to editor when editor is not focuced.
     *
     * @attribute placeholderClass
     * @default ae_placeholder
     * @type String
     */

    CKEDITOR.plugins.add('ae_placeholder', {

        /**
         * Initialization of the plugin, part of CKEditor plugin lifecycle.
         * The function registers a 'blur' and 'contentDom' event listeners.
         *
         * @method init
         * @param {Object} editor The current editor instance
         */
        init: function (editor) {
            editor.on('blur', this._checkEmptyData, this);
            editor.once('contentDom', this._checkEmptyData, this);
        },

        /**
         * Removes any data from the content and adds a class,
         * specified by the "placeholderClass" config attribute.
         *
         * @protected
         * @method _checkEmptyData
         * @param {CKEDITOR.dom.event} editor event, fired from CKEditor
         */
        _checkEmptyData: function (event) {
            var editor = event.editor;

            if (editor.getData() === '') {
                var editorNode = new CKEDITOR.dom.element(editor.element.$);

                // Despite getData() returns empty string, the content still may have
                // data - an empty paragraph. This breaks the :empty selector in
                // placeholder's CSS and placeholder does not appear.
                // For that reason, we will intentionally remove any content from editorNode.
                editorNode.setHtml('');

                editorNode.addClass(editor.config.placeholderClass);
            }
        }
    });
})();
/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

(function () {
    'use strict';

    if (CKEDITOR.plugins.get('ae_tableresize')) {
        return;
    }

    var pxUnit = CKEDITOR.tools.cssLength;

    function getWidth(el) {
        return CKEDITOR.env.ie ? el.$.clientWidth : parseInt(el.getComputedStyle('width'), 10);
    }

    function getBorderWidth(element, side) {
        var computed = element.getComputedStyle('border-' + side + '-width'),
            borderMap = {
            thin: '0px',
            medium: '1px',
            thick: '2px'
        };

        if (computed.indexOf('px') < 0) {
            // look up keywords
            if (computed in borderMap && element.getComputedStyle('border-style') != 'none') {
                computed = borderMap[computed];
            } else {
                computed = 0;
            }
        }

        return parseInt(computed, 10);
    }

    // Gets the table row that contains the most columns.
    function getMasterPillarRow(table) {
        var $rows = table.$.rows,
            maxCells = 0,
            cellsCount,
            $elected,
            $tr;

        for (var i = 0, len = $rows.length; i < len; i++) {
            $tr = $rows[i];
            cellsCount = $tr.cells.length;

            if (cellsCount > maxCells) {
                maxCells = cellsCount;
                $elected = $tr;
            }
        }

        return $elected;
    }

    function buildTableColumnPillars(table) {
        var pillars = [],
            pillarIndex = -1,
            rtl = table.getComputedStyle('direction') === 'rtl';

        // Get the raw row element that cointains the most columns.
        var $tr = getMasterPillarRow(table);

        // Get the tbody element and position, which will be used to set the
        // top and bottom boundaries.
        var tbody = new CKEDITOR.dom.element(table.$.tBodies[0]),
            tbodyPosition = tbody.getDocumentPosition();

        // Loop thorugh all cells, building pillars after each one of them.
        for (var i = 0, len = $tr.cells.length; i < len; i++) {
            // Both the current cell and the successive one will be used in the
            // pillar size calculation.
            var td = new CKEDITOR.dom.element($tr.cells[i]),
                nextTd = $tr.cells[i + 1] && new CKEDITOR.dom.element($tr.cells[i + 1]);

            pillarIndex += td.$.colSpan || 1;

            // Calculate the pillar boundary positions.
            var pillarLeft, pillarRight, pillarWidth;

            var x = td.getDocumentPosition().x;

            // Calculate positions based on the current cell.
            rtl ? pillarRight = x + getBorderWidth(td, 'left') : pillarLeft = x + td.$.offsetWidth - getBorderWidth(td, 'right');

            // Calculate positions based on the next cell, if available.
            if (nextTd) {
                x = nextTd.getDocumentPosition().x;

                rtl ? pillarLeft = x + nextTd.$.offsetWidth - getBorderWidth(nextTd, 'right') : pillarRight = x + getBorderWidth(nextTd, 'left');
            }
            // Otherwise calculate positions based on the table (for last cell).
            else {
                    x = table.getDocumentPosition().x;

                    rtl ? pillarLeft = x : pillarRight = x + table.$.offsetWidth;
                }

            pillarWidth = Math.max(pillarRight - pillarLeft, 4);

            // The pillar should reflects exactly the shape of the hovered
            // column border line.
            pillars.push({
                table: table,
                index: pillarIndex,
                x: pillarLeft,
                y: tbodyPosition.y,
                width: pillarWidth,
                height: tbody.$.offsetHeight,
                rtl: rtl
            });
        }

        return pillars;
    }

    function getPillarAtPosition(pillars, positionX) {
        for (var i = 0, len = pillars.length; i < len; i++) {
            var pillar = pillars[i];

            if (positionX >= pillar.x && positionX <= pillar.x + pillar.width) {
                return pillar;
            }
        }

        return null;
    }

    function cancel(evt) {
        (evt.data || evt).preventDefault();
    }

    function columnResizer(editor) {
        var pillar, document, resizer, isResizing, startOffset, currentShift;

        var leftSideCells, rightSideCells, leftShiftBoundary, rightShiftBoundary;

        function detach() {
            pillar = null;
            currentShift = 0;
            isResizing = 0;

            document.removeListener('mouseup', onMouseUp);
            resizer.removeListener('mousedown', onMouseDown);
            resizer.removeListener('mousemove', onMouseMove);

            document.getBody().setStyle('cursor', 'auto');
        }

        function resizeStart() {
            // Before starting to resize, figure out which cells to change
            // and the boundaries of this resizing shift.

            var columnIndex = pillar.index,
                map = CKEDITOR.tools.buildTableMap(pillar.table),
                leftColumnCells = [],
                rightColumnCells = [],
                leftMinSize = Number.MAX_VALUE,
                rightMinSize = leftMinSize,
                rtl = pillar.rtl;

            for (var i = 0, len = map.length; i < len; i++) {
                var row = map[i],
                    leftCell = row[columnIndex + (rtl ? 1 : 0)],
                    rightCell = row[columnIndex + (rtl ? 0 : 1)];

                leftCell = leftCell && new CKEDITOR.dom.element(leftCell);
                rightCell = rightCell && new CKEDITOR.dom.element(rightCell);

                if (!leftCell || !rightCell || !leftCell.equals(rightCell)) {
                    leftCell && (leftMinSize = Math.min(leftMinSize, getWidth(leftCell)));
                    rightCell && (rightMinSize = Math.min(rightMinSize, getWidth(rightCell)));

                    leftColumnCells.push(leftCell);
                    rightColumnCells.push(rightCell);
                }
            }

            // Cache the list of cells to be resized.
            leftSideCells = leftColumnCells;
            rightSideCells = rightColumnCells;

            // Cache the resize limit boundaries.
            leftShiftBoundary = pillar.x - leftMinSize;
            rightShiftBoundary = pillar.x + rightMinSize;

            resizer.setOpacity(0.5);
            startOffset = parseInt(resizer.getStyle('left'), 10);
            currentShift = 0;
            isResizing = 1;

            resizer.on('mousemove', onMouseMove);

            // Prevent the native drag behavior otherwise 'mousemove' won't fire.
            document.on('dragstart', cancel);
        }

        function resizeEnd() {
            isResizing = 0;

            resizer.setOpacity(0);

            currentShift && resizeColumn();

            var table = pillar.table;
            setTimeout(function () {
                table.removeCustomData('_cke_table_pillars');
            }, 0);

            document.removeListener('dragstart', cancel);
        }

        function resizeColumn() {
            var rtl = pillar.rtl,
                cellsCount = rtl ? rightSideCells.length : leftSideCells.length;

            // Perform the actual resize to table cells, only for those by side of the pillar.
            for (var i = 0; i < cellsCount; i++) {
                var leftCell = leftSideCells[i],
                    rightCell = rightSideCells[i],
                    table = pillar.table;

                // Defer the resizing to avoid any interference among cells.
                CKEDITOR.tools.setTimeout(function (leftCell, leftOldWidth, rightCell, rightOldWidth, tableWidth, sizeShift) {
                    // 1px is the minimum valid width (#11626).
                    leftCell && leftCell.setStyle('width', pxUnit(Math.max(leftOldWidth + sizeShift, 1)));
                    rightCell && rightCell.setStyle('width', pxUnit(Math.max(rightOldWidth - sizeShift, 1)));

                    // If we're in the last cell, we need to resize the table as well
                    if (tableWidth) {
                        table.setStyle('width', pxUnit(tableWidth + sizeShift * (rtl ? -1 : 1)));
                    }
                }, 0, this, [leftCell, leftCell && getWidth(leftCell), rightCell, rightCell && getWidth(rightCell), (!leftCell || !rightCell) && getWidth(table) + getBorderWidth(table, 'left') + getBorderWidth(table, 'right'), currentShift]);
            }
        }

        function onMouseDown(evt) {
            cancel(evt);

            resizeStart();

            document.on('mouseup', onMouseUp, this);
        }

        function onMouseUp(evt) {
            evt.removeListener();

            resizeEnd();
        }

        function onMouseMove(evt) {
            move(evt.data.getPageOffset().x);
        }

        document = editor.document;

        resizer = CKEDITOR.dom.element.createFromHtml('<div data-cke-temp=1 contenteditable=false unselectable=on ' + 'style="position:absolute;cursor:col-resize;filter:alpha(opacity=0);opacity:0;' + 'padding:0;background-color:#004;background-image:none;border:0px none;z-index:10"></div>', document);

        // Clean DOM when editor is destroyed.
        editor.on('destroy', function () {
            resizer.remove();
        });

        // Place the resizer after body to prevent it
        // from being editable.
        document.getDocumentElement().append(resizer);

        this.attachTo = function (targetPillar) {
            // Accept only one pillar at a time.
            if (isResizing) {
                return;
            }

            pillar = targetPillar;

            resizer.setStyles({
                width: pxUnit(targetPillar.width),
                height: pxUnit(targetPillar.height),
                left: pxUnit(targetPillar.x),
                top: pxUnit(targetPillar.y)
            });

            resizer.on('mousedown', onMouseDown, this);

            document.getBody().setStyle('cursor', 'col-resize');

            // Display the resizer to receive events but don't show it,
            // only change the cursor to resizable shape.
            resizer.show();
        };

        var move = this.move = function (posX) {
            if (!pillar) {
                return 0;
            }

            if (!isResizing && (posX < pillar.x || posX > pillar.x + pillar.width)) {
                detach();
                return 0;
            }

            var resizerNewPosition = posX - Math.round(resizer.$.offsetWidth / 2);

            if (isResizing) {
                if (resizerNewPosition === leftShiftBoundary || resizerNewPosition === rightShiftBoundary) {
                    return 1;
                }

                resizerNewPosition = Math.max(resizerNewPosition, leftShiftBoundary);
                resizerNewPosition = Math.min(resizerNewPosition, rightShiftBoundary);

                currentShift = resizerNewPosition - startOffset;
            }

            resizer.setStyle('left', pxUnit(resizerNewPosition));

            return 1;
        };
    }

    function clearPillarsCache(evt) {
        var target = evt.data.getTarget();

        if (evt.name === 'mouseout') {
            // Bypass interal mouse move.
            if (!target.is('table')) {
                return;
            }

            var dest = new CKEDITOR.dom.element(evt.data.$.relatedTarget || evt.data.$.toElement);
            while (dest && dest.$ && !dest.equals(target) && !dest.is('body')) {
                dest = dest.getParent();
            }
            if (!dest || dest.equals(target)) {
                return;
            }
        }

        target.getAscendant('table', 1).removeCustomData('_cke_table_pillars');
        evt.removeListener();
    }

    CKEDITOR.plugins.add('ae_tableresize', {
        requires: 'ae_tabletools',

        init: function (editor) {
            editor.on('contentDom', function () {
                var resizer,
                    editable = editor.editable();

                // In Classic editor it is better to use document
                // instead of editable so event will work below body.
                editable.attachListener(editable.isInline() ? editable : editor.document, 'mousemove', function (evt) {
                    evt = evt.data;

                    var target = evt.getTarget();

                    // FF may return document and IE8 some UFO (object with no nodeType property...)
                    // instead of an element (#11823).
                    if (target.type !== CKEDITOR.NODE_ELEMENT) {
                        return;
                    }

                    var pageX = evt.getPageOffset().x;

                    // If we're already attached to a pillar, simply move the
                    // resizer.
                    if (resizer && resizer.move(pageX)) {
                        cancel(evt);
                        return;
                    }

                    // Considering table, tr, td, tbody but nothing else.
                    var table, pillars;

                    if (!target.is('table') && !target.getAscendant('tbody', 1)) {
                        return;
                    }

                    table = target.getAscendant('table', 1);

                    // Make sure the table we found is inside the container
                    // (eg. we should not use tables the editor is embedded within)
                    if (!editor.editable().contains(table)) {
                        return;
                    }

                    if (!(pillars = table.getCustomData('_cke_table_pillars'))) {
                        // Cache table pillars calculation result.
                        table.setCustomData('_cke_table_pillars', pillars = buildTableColumnPillars(table));
                        table.on('mouseout', clearPillarsCache);
                        table.on('mousedown', clearPillarsCache);
                    }

                    var pillar = getPillarAtPosition(pillars, pageX);
                    if (pillar) {
                        !resizer && (resizer = new columnResizer(editor));
                        resizer.attachTo(pillar);
                    }
                });
            });
        }
    });
})();
/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

(function () {
	'use strict';

	if (CKEDITOR.plugins.get('ae_tabletools')) {
		return;
	}

	var cellNodeRegex = /^(?:td|th)$/;

	function getSelectedCells(selection) {
		var ranges = selection.getRanges();
		var retval = [];
		var database = {};

		function moveOutOfCellGuard(node) {
			// Apply to the first cell only.
			if (retval.length > 0) return;

			// If we are exiting from the first </td>, then the td should definitely be
			// included.
			if (node.type == CKEDITOR.NODE_ELEMENT && cellNodeRegex.test(node.getName()) && !node.getCustomData('selected_cell')) {
				CKEDITOR.dom.element.setMarker(database, node, 'selected_cell', true);
				retval.push(node);
			}
		}

		for (var i = 0; i < ranges.length; i++) {
			var range = ranges[i];

			if (range.collapsed) {
				// Walker does not handle collapsed ranges yet - fall back to old API.
				var startNode = range.getCommonAncestor();
				var nearestCell = startNode.getAscendant('td', true) || startNode.getAscendant('th', true);
				if (nearestCell) retval.push(nearestCell);
			} else {
				var walker = new CKEDITOR.dom.walker(range);
				var node;
				walker.guard = moveOutOfCellGuard;

				while (node = walker.next()) {
					// If may be possible for us to have a range like this:
					// <td>^1</td><td>^2</td>
					// The 2nd td shouldn't be included.
					//
					// So we have to take care to include a td we've entered only when we've
					// walked into its children.

					if (node.type != CKEDITOR.NODE_ELEMENT || !node.is(CKEDITOR.dtd.table)) {
						var parent = node.getAscendant('td', true) || node.getAscendant('th', true);
						if (parent && !parent.getCustomData('selected_cell')) {
							CKEDITOR.dom.element.setMarker(database, parent, 'selected_cell', true);
							retval.push(parent);
						}
					}
				}
			}
		}

		CKEDITOR.dom.element.clearAllMarkers(database);

		return retval;
	}

	function getFocusElementAfterDelCells(cellsToDelete) {
		var i = 0,
		    last = cellsToDelete.length - 1,
		    database = {},
		    cell,
		    focusedCell,
		    tr;

		while (cell = cellsToDelete[i++]) CKEDITOR.dom.element.setMarker(database, cell, 'delete_cell', true);

		// 1.first we check left or right side focusable cell row by row;
		i = 0;
		while (cell = cellsToDelete[i++]) {
			if ((focusedCell = cell.getPrevious()) && !focusedCell.getCustomData('delete_cell') || (focusedCell = cell.getNext()) && !focusedCell.getCustomData('delete_cell')) {
				CKEDITOR.dom.element.clearAllMarkers(database);
				return focusedCell;
			}
		}

		CKEDITOR.dom.element.clearAllMarkers(database);

		// 2. then we check the toppest row (outside the selection area square) focusable cell
		tr = cellsToDelete[0].getParent();
		if (tr = tr.getPrevious()) return tr.getLast();

		// 3. last we check the lowerest  row focusable cell
		tr = cellsToDelete[last].getParent();
		if (tr = tr.getNext()) return tr.getChild(0);

		return null;
	}

	function insertRow(selection, insertBefore) {
		var cells = getSelectedCells(selection),
		    firstCell = cells[0],
		    table = firstCell.getAscendant('table'),
		    doc = firstCell.getDocument(),
		    startRow = cells[0].getParent(),
		    startRowIndex = startRow.$.rowIndex,
		    lastCell = cells[cells.length - 1],
		    endRowIndex = lastCell.getParent().$.rowIndex + lastCell.$.rowSpan - 1,
		    endRow = new CKEDITOR.dom.element(table.$.rows[endRowIndex]),
		    rowIndex = insertBefore ? startRowIndex : endRowIndex,
		    row = insertBefore ? startRow : endRow;

		var map = CKEDITOR.tools.buildTableMap(table),
		    cloneRow = map[rowIndex],
		    nextRow = insertBefore ? map[rowIndex - 1] : map[rowIndex + 1],
		    width = map[0].length;

		var newRow = doc.createElement('tr');
		for (var i = 0; cloneRow[i] && i < width; i++) {
			var cell;
			// Check whether there's a spanning row here, do not break it.
			if (cloneRow[i].rowSpan > 1 && nextRow && cloneRow[i] == nextRow[i]) {
				cell = cloneRow[i];
				cell.rowSpan += 1;
			} else {
				cell = new CKEDITOR.dom.element(cloneRow[i]).clone();
				cell.removeAttribute('rowSpan');
				cell.appendBogus();
				newRow.append(cell);
				cell = cell.$;
			}

			i += cell.colSpan - 1;
		}

		insertBefore ? newRow.insertBefore(row) : newRow.insertAfter(row);
	}

	function deleteRows(selectionOrRow) {
		if (selectionOrRow instanceof CKEDITOR.dom.selection) {
			var cells = getSelectedCells(selectionOrRow),
			    firstCell = cells[0],
			    table = firstCell.getAscendant('table'),
			    map = CKEDITOR.tools.buildTableMap(table),
			    startRow = cells[0].getParent(),
			    startRowIndex = startRow.$.rowIndex,
			    lastCell = cells[cells.length - 1],
			    endRowIndex = lastCell.getParent().$.rowIndex + lastCell.$.rowSpan - 1,
			    rowsToDelete = [];

			// Delete cell or reduce cell spans by checking through the table map.
			for (var i = startRowIndex; i <= endRowIndex; i++) {
				var mapRow = map[i],
				    row = new CKEDITOR.dom.element(table.$.rows[i]);

				for (var j = 0; j < mapRow.length; j++) {
					var cell = new CKEDITOR.dom.element(mapRow[j]),
					    cellRowIndex = cell.getParent().$.rowIndex;

					if (cell.$.rowSpan == 1) cell.remove();
					// Row spanned cell.
					else {
							// Span row of the cell, reduce spanning.
							cell.$.rowSpan -= 1;
							// Root row of the cell, root cell to next row.
							if (cellRowIndex == i) {
								var nextMapRow = map[i + 1];
								nextMapRow[j - 1] ? cell.insertAfter(new CKEDITOR.dom.element(nextMapRow[j - 1])) : new CKEDITOR.dom.element(table.$.rows[i + 1]).append(cell, 1);
							}
						}

					j += cell.$.colSpan - 1;
				}

				rowsToDelete.push(row);
			}

			var rows = table.$.rows;

			// Where to put the cursor after rows been deleted?
			// 1. Into next sibling row if any;
			// 2. Into previous sibling row if any;
			// 3. Into table's parent element if it's the very last row.
			var cursorPosition = new CKEDITOR.dom.element(rows[endRowIndex + 1] || (startRowIndex > 0 ? rows[startRowIndex - 1] : null) || table.$.parentNode);

			for (i = rowsToDelete.length; i >= 0; i--) deleteRows(rowsToDelete[i]);

			return cursorPosition;
		} else if (selectionOrRow instanceof CKEDITOR.dom.element) {
			table = selectionOrRow.getAscendant('table');

			if (table.$.rows.length == 1) table.remove();else selectionOrRow.remove();
		}

		return null;
	}

	function getCellColIndex(cell, isStart) {
		var row = cell.getParent(),
		    rowCells = row.$.cells;

		var colIndex = 0;
		for (var i = 0; i < rowCells.length; i++) {
			var mapCell = rowCells[i];
			colIndex += isStart ? 1 : mapCell.colSpan;
			if (mapCell == cell.$) break;
		}

		return colIndex - 1;
	}

	function getColumnsIndices(cells, isStart) {
		var retval = isStart ? Infinity : 0;
		for (var i = 0; i < cells.length; i++) {
			var colIndex = getCellColIndex(cells[i], isStart);
			if (isStart ? colIndex < retval : colIndex > retval) retval = colIndex;
		}
		return retval;
	}

	function insertColumn(selection, insertBefore) {
		var cells = getSelectedCells(selection),
		    firstCell = cells[0],
		    table = firstCell.getAscendant('table'),
		    startCol = getColumnsIndices(cells, 1),
		    lastCol = getColumnsIndices(cells),
		    colIndex = insertBefore ? startCol : lastCol;

		var map = CKEDITOR.tools.buildTableMap(table),
		    cloneCol = [],
		    nextCol = [],
		    height = map.length;

		for (var i = 0; i < height; i++) {
			cloneCol.push(map[i][colIndex]);
			var nextCell = insertBefore ? map[i][colIndex - 1] : map[i][colIndex + 1];
			nextCol.push(nextCell);
		}

		for (i = 0; i < height; i++) {
			var cell;

			if (!cloneCol[i]) continue;

			// Check whether there's a spanning column here, do not break it.
			if (cloneCol[i].colSpan > 1 && nextCol[i] == cloneCol[i]) {
				cell = cloneCol[i];
				cell.colSpan += 1;
			} else {
				cell = new CKEDITOR.dom.element(cloneCol[i]).clone();
				cell.removeAttribute('colSpan');
				cell.appendBogus();
				cell[insertBefore ? 'insertBefore' : 'insertAfter'].call(cell, new CKEDITOR.dom.element(cloneCol[i]));
				cell = cell.$;
			}

			i += cell.rowSpan - 1;
		}
	}

	function deleteColumns(selectionOrCell) {
		var cells = getSelectedCells(selectionOrCell),
		    firstCell = cells[0],
		    lastCell = cells[cells.length - 1],
		    table = firstCell.getAscendant('table'),
		    map = CKEDITOR.tools.buildTableMap(table),
		    startColIndex,
		    endColIndex,
		    rowsToDelete = [];

		// Figure out selected cells' column indices.
		for (var i = 0, rows = map.length; i < rows; i++) {
			for (var j = 0, cols = map[i].length; j < cols; j++) {
				if (map[i][j] == firstCell.$) startColIndex = j;
				if (map[i][j] == lastCell.$) endColIndex = j;
			}
		}

		// Delete cell or reduce cell spans by checking through the table map.
		for (i = startColIndex; i <= endColIndex; i++) {
			for (j = 0; j < map.length; j++) {
				var mapRow = map[j],
				    row = new CKEDITOR.dom.element(table.$.rows[j]),
				    cell = new CKEDITOR.dom.element(mapRow[i]);

				if (cell.$) {
					if (cell.$.colSpan == 1) cell.remove();
					// Reduce the col spans.
					else cell.$.colSpan -= 1;

					j += cell.$.rowSpan - 1;

					if (!row.$.cells.length) rowsToDelete.push(row);
				}
			}
		}

		var firstRowCells = table.$.rows[0] && table.$.rows[0].cells;

		// Where to put the cursor after columns been deleted?
		// 1. Into next cell of the first row if any;
		// 2. Into previous cell of the first row if any;
		// 3. Into table's parent element;
		var cursorPosition = new CKEDITOR.dom.element(firstRowCells[startColIndex] || (startColIndex ? firstRowCells[startColIndex - 1] : table.$.parentNode));

		// Delete table rows only if all columns are gone (do not remove empty row).
		if (rowsToDelete.length == rows) table.remove();

		return cursorPosition;
	}

	function insertCell(selection, insertBefore) {
		var startElement = selection.getStartElement();
		var cell = startElement.getAscendant('td', 1) || startElement.getAscendant('th', 1);

		if (!cell) return;

		// Create the new cell element to be added.
		var newCell = cell.clone();
		newCell.appendBogus();

		if (insertBefore) newCell.insertBefore(cell);else newCell.insertAfter(cell);
	}

	function deleteCells(selectionOrCell) {
		if (selectionOrCell instanceof CKEDITOR.dom.selection) {
			var cellsToDelete = getSelectedCells(selectionOrCell);
			var table = cellsToDelete[0] && cellsToDelete[0].getAscendant('table');
			var cellToFocus = getFocusElementAfterDelCells(cellsToDelete);

			for (var i = cellsToDelete.length - 1; i >= 0; i--) deleteCells(cellsToDelete[i]);

			if (cellToFocus) placeCursorInCell(cellToFocus, true);else if (table) table.remove();
		} else if (selectionOrCell instanceof CKEDITOR.dom.element) {
			var tr = selectionOrCell.getParent();
			if (tr.getChildCount() == 1) tr.remove();else selectionOrCell.remove();
		}
	}

	// Remove filler at end and empty spaces around the cell content.
	function trimCell(cell) {
		var bogus = cell.getBogus();
		bogus && bogus.remove();
		cell.trim();
	}

	function placeCursorInCell(cell, placeAtEnd) {
		var docInner = cell.getDocument(),
		    docOuter = CKEDITOR.document;

		// Fixing "Unspecified error" thrown in IE10 by resetting
		// selection the dirty and shameful way (#10308).
		// We can not apply this hack to IE8 because
		// it causes error (#11058).
		if (CKEDITOR.env.ie && CKEDITOR.env.version == 10) {
			docOuter.focus();
			docInner.focus();
		}

		var range = new CKEDITOR.dom.range(docInner);
		if (!range['moveToElementEdit' + (placeAtEnd ? 'End' : 'Start')](cell)) {
			range.selectNodeContents(cell);
			range.collapse(placeAtEnd ? false : true);
		}
		range.select(true);
	}

	function cellInRow(tableMap, rowIndex, cell) {
		var oRow = tableMap[rowIndex];
		if (typeof cell == 'undefined') return oRow;

		for (var c = 0; oRow && c < oRow.length; c++) {
			if (cell.is && oRow[c] == cell.$) return c;else if (c == cell) return new CKEDITOR.dom.element(oRow[c]);
		}
		return cell.is ? -1 : null;
	}

	function cellInCol(tableMap, colIndex) {
		var oCol = [];
		for (var r = 0; r < tableMap.length; r++) {
			var row = tableMap[r];
			oCol.push(row[colIndex]);

			// Avoid adding duplicate cells.
			if (row[colIndex].rowSpan > 1) r += row[colIndex].rowSpan - 1;
		}
		return oCol;
	}

	function mergeCells(selection, mergeDirection, isDetect) {
		var cells = getSelectedCells(selection);

		// Invalid merge request if:
		// 1. In batch mode despite that less than two selected.
		// 2. In solo mode while not exactly only one selected.
		// 3. Cells distributed in different table groups (e.g. from both thead and tbody).
		var commonAncestor;
		if ((mergeDirection ? cells.length != 1 : cells.length < 2) || (commonAncestor = selection.getCommonAncestor()) && commonAncestor.type == CKEDITOR.NODE_ELEMENT && commonAncestor.is('table')) return false;

		var cell,
		    firstCell = cells[0],
		    table = firstCell.getAscendant('table'),
		    map = CKEDITOR.tools.buildTableMap(table),
		    mapHeight = map.length,
		    mapWidth = map[0].length,
		    startRow = firstCell.getParent().$.rowIndex,
		    startColumn = cellInRow(map, startRow, firstCell);

		if (mergeDirection) {
			var targetCell;
			try {
				var rowspan = parseInt(firstCell.getAttribute('rowspan'), 10) || 1;
				var colspan = parseInt(firstCell.getAttribute('colspan'), 10) || 1;

				targetCell = map[mergeDirection == 'up' ? startRow - rowspan : mergeDirection == 'down' ? startRow + rowspan : startRow][mergeDirection == 'left' ? startColumn - colspan : mergeDirection == 'right' ? startColumn + colspan : startColumn];
			} catch (er) {
				return false;
			}

			// 1. No cell could be merged.
			// 2. Same cell actually.
			if (!targetCell || firstCell.$ == targetCell) return false;

			// Sort in map order regardless of the DOM sequence.
			cells[mergeDirection == 'up' || mergeDirection == 'left' ? 'unshift' : 'push'](new CKEDITOR.dom.element(targetCell));
		}

		// Start from here are merging way ignorance (merge up/right, batch merge).
		var doc = firstCell.getDocument(),
		    lastRowIndex = startRow,
		    totalRowSpan = 0,
		    totalColSpan = 0,
		   
		// Use a documentFragment as buffer when appending cell contents.
		frag = !isDetect && new CKEDITOR.dom.documentFragment(doc),
		    dimension = 0;

		for (var i = 0; i < cells.length; i++) {
			cell = cells[i];

			var tr = cell.getParent(),
			    cellFirstChild = cell.getFirst(),
			    colSpan = cell.$.colSpan,
			    rowSpan = cell.$.rowSpan,
			    rowIndex = tr.$.rowIndex,
			    colIndex = cellInRow(map, rowIndex, cell);

			// Accumulated the actual places taken by all selected cells.
			dimension += colSpan * rowSpan;
			// Accumulated the maximum virtual spans from column and row.
			totalColSpan = Math.max(totalColSpan, colIndex - startColumn + colSpan);
			totalRowSpan = Math.max(totalRowSpan, rowIndex - startRow + rowSpan);

			if (!isDetect) {
				// Trim all cell fillers and check to remove empty cells.
				if ((trimCell(cell), cell.getChildren().count())) {
					// Merge vertically cells as two separated paragraphs.
					if (rowIndex != lastRowIndex && cellFirstChild && !(cellFirstChild.isBlockBoundary && cellFirstChild.isBlockBoundary({ br: 1 }))) {
						var last = frag.getLast(CKEDITOR.dom.walker.whitespaces(true));
						if (last && !(last.is && last.is('br'))) frag.append('br');
					}

					cell.moveChildren(frag);
				}
				i ? cell.remove() : cell.setHtml('');
			}
			lastRowIndex = rowIndex;
		}

		if (!isDetect) {
			frag.moveChildren(firstCell);

			firstCell.appendBogus();

			if (totalColSpan >= mapWidth) firstCell.removeAttribute('rowSpan');else firstCell.$.rowSpan = totalRowSpan;

			if (totalRowSpan >= mapHeight) firstCell.removeAttribute('colSpan');else firstCell.$.colSpan = totalColSpan;

			// Swip empty <tr> left at the end of table due to the merging.
			var trs = new CKEDITOR.dom.nodeList(table.$.rows),
			    count = trs.count();

			for (i = count - 1; i >= 0; i--) {
				var tailTr = trs.getItem(i);
				if (!tailTr.$.cells.length) {
					tailTr.remove();
					count++;
					continue;
				}
			}

			return firstCell;
		}
		// Be able to merge cells only if actual dimension of selected
		// cells equals to the caculated rectangle.
		else {
				return totalRowSpan * totalColSpan == dimension;
			}
	}

	function verticalSplitCell(selection, isDetect) {
		var cells = getSelectedCells(selection);
		if (cells.length > 1) return false;else if (isDetect) return true;

		var cell = cells[0],
		    tr = cell.getParent(),
		    table = tr.getAscendant('table'),
		    map = CKEDITOR.tools.buildTableMap(table),
		    rowIndex = tr.$.rowIndex,
		    colIndex = cellInRow(map, rowIndex, cell),
		    rowSpan = cell.$.rowSpan,
		    newCell,
		    newRowSpan,
		    newCellRowSpan,
		    newRowIndex;

		if (rowSpan > 1) {
			newRowSpan = Math.ceil(rowSpan / 2);
			newCellRowSpan = Math.floor(rowSpan / 2);
			newRowIndex = rowIndex + newRowSpan;
			var newCellTr = new CKEDITOR.dom.element(table.$.rows[newRowIndex]),
			    newCellRow = cellInRow(map, newRowIndex),
			    candidateCell;

			newCell = cell.clone();

			// Figure out where to insert the new cell by checking the vitual row.
			for (var c = 0; c < newCellRow.length; c++) {
				candidateCell = newCellRow[c];
				// Catch first cell actually following the column.
				if (candidateCell.parentNode == newCellTr.$ && c > colIndex) {
					newCell.insertBefore(new CKEDITOR.dom.element(candidateCell));
					break;
				} else {
					candidateCell = null;
				}
			}

			// The destination row is empty, append at will.
			if (!candidateCell) newCellTr.append(newCell);
		} else {
			newCellRowSpan = newRowSpan = 1;

			newCellTr = tr.clone();
			newCellTr.insertAfter(tr);
			newCellTr.append(newCell = cell.clone());

			var cellsInSameRow = cellInRow(map, rowIndex);
			for (var i = 0; i < cellsInSameRow.length; i++) cellsInSameRow[i].rowSpan++;
		}

		newCell.appendBogus();

		cell.$.rowSpan = newRowSpan;
		newCell.$.rowSpan = newCellRowSpan;
		if (newRowSpan == 1) cell.removeAttribute('rowSpan');
		if (newCellRowSpan == 1) newCell.removeAttribute('rowSpan');

		return newCell;
	}

	function horizontalSplitCell(selection, isDetect) {
		var cells = getSelectedCells(selection);
		if (cells.length > 1) return false;else if (isDetect) return true;

		var cell = cells[0],
		    tr = cell.getParent(),
		    table = tr.getAscendant('table'),
		    map = CKEDITOR.tools.buildTableMap(table),
		    rowIndex = tr.$.rowIndex,
		    colIndex = cellInRow(map, rowIndex, cell),
		    colSpan = cell.$.colSpan,
		    newCell,
		    newColSpan,
		    newCellColSpan;

		if (colSpan > 1) {
			newColSpan = Math.ceil(colSpan / 2);
			newCellColSpan = Math.floor(colSpan / 2);
		} else {
			newCellColSpan = newColSpan = 1;
			var cellsInSameCol = cellInCol(map, colIndex);
			for (var i = 0; i < cellsInSameCol.length; i++) cellsInSameCol[i].colSpan++;
		}
		newCell = cell.clone();
		newCell.insertAfter(cell);
		newCell.appendBogus();

		cell.$.colSpan = newColSpan;
		newCell.$.colSpan = newCellColSpan;
		if (newColSpan == 1) cell.removeAttribute('colSpan');
		if (newCellColSpan == 1) newCell.removeAttribute('colSpan');

		return newCell;
	}

	CKEDITOR.plugins.add('ae_tabletools', {
		init: function (editor) {
			var lang = editor.lang.table;

			function createDef(def) {
				return CKEDITOR.tools.extend(def || {}, {
					contextSensitive: 1,
					refresh: function (editor, path) {
						this.setState(path.contains({ td: 1, th: 1 }, 1) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED);
					}
				});
			}
			function addCmd(name, def) {
				var cmd = editor.getCommand(name);

				if (cmd) {
					return;
				}

				cmd = editor.addCommand(name, def);
				editor.addFeature(cmd);
			}

			addCmd('rowDelete', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					placeCursorInCell(deleteRows(selection));
				}
			}));

			addCmd('rowInsertBefore', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					insertRow(selection, true);
				}
			}));

			addCmd('rowInsertAfter', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					insertRow(selection);
				}
			}));

			addCmd('columnDelete', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					var element = deleteColumns(selection);
					element && placeCursorInCell(element, true);
				}
			}));

			addCmd('columnInsertBefore', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					insertColumn(selection, true);
				}
			}));

			addCmd('columnInsertAfter', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					insertColumn(selection);
				}
			}));

			addCmd('cellDelete', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					deleteCells(selection);
				}
			}));

			addCmd('cellMerge', createDef({
				allowedContent: 'td[colspan,rowspan]',
				requiredContent: 'td[colspan,rowspan]',
				exec: function (editor) {
					placeCursorInCell(mergeCells(editor.getSelection()), true);
				}
			}));

			addCmd('cellMergeRight', createDef({
				allowedContent: 'td[colspan]',
				requiredContent: 'td[colspan]',
				exec: function (editor) {
					placeCursorInCell(mergeCells(editor.getSelection(), 'right'), true);
				}
			}));

			addCmd('cellMergeDown', createDef({
				allowedContent: 'td[rowspan]',
				requiredContent: 'td[rowspan]',
				exec: function (editor) {
					placeCursorInCell(mergeCells(editor.getSelection(), 'down'), true);
				}
			}));

			addCmd('cellVerticalSplit', createDef({
				allowedContent: 'td[rowspan]',
				requiredContent: 'td[rowspan]',
				exec: function (editor) {
					placeCursorInCell(verticalSplitCell(editor.getSelection()));
				}
			}));

			addCmd('cellHorizontalSplit', createDef({
				allowedContent: 'td[colspan]',
				requiredContent: 'td[colspan]',
				exec: function (editor) {
					placeCursorInCell(horizontalSplitCell(editor.getSelection()));
				}
			}));

			addCmd('cellInsertBefore', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					insertCell(selection, true);
				}
			}));

			addCmd('cellInsertAfter', createDef({
				requiredContent: 'table',
				exec: function (editor) {
					var selection = editor.getSelection();
					insertCell(selection);
				}
			}));
		},

		getSelectedCells: getSelectedCells

	});
})();

/**
 * Create a two-dimension array that reflects the actual layout of table cells,
 * with cell spans, with mappings to the original td elements.
 *
 * @param {CKEDITOR.dom.element} table
 * @member CKEDITOR.tools
 */
CKEDITOR.tools.buildTableMap = function (table) {
	var aRows = table.$.rows;

	// Row and Column counters.
	var r = -1;

	var aMap = [];

	for (var i = 0; i < aRows.length; i++) {
		r++;
		!aMap[r] && (aMap[r] = []);

		var c = -1;

		for (var j = 0; j < aRows[i].cells.length; j++) {
			var oCell = aRows[i].cells[j];

			c++;
			while (aMap[r][c]) c++;

			var iColSpan = isNaN(oCell.colSpan) ? 1 : oCell.colSpan;
			var iRowSpan = isNaN(oCell.rowSpan) ? 1 : oCell.rowSpan;

			for (var rs = 0; rs < iRowSpan; rs++) {
				if (!aMap[r + rs]) aMap[r + rs] = [];

				for (var cs = 0; cs < iColSpan; cs++) {
					aMap[r + rs][c + cs] = aRows[i].cells[j];
				}
			}

			c += iColSpan - 1;
		}
	}
	return aMap;
};