/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define(function(require, exports, module) {
    var Surface = require('famous/core/Surface');

    /**
     *  A Famo.us surface in the form of an HTML input element.
     *
     * @class TextAreaSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     * @param {string} [options.placeholder] placeholder text hint that describes the expected value of an <textarea> element
     * @param {string} [options.type] specifies the type of element to display (e.g. 'datetime', 'text', 'button', etc.)
     * @param {string} [options.value] value of text
     */
    function TextAreaSurface(options) {
        options = options || {};
        this._placeholder = options.placeholder || '';
        this._value       = options.value || '';
        this._type        = options.type || 'text';
        this._name        = options.name || '';

        Surface.apply(this, arguments);
        this.on('click', this.focus.bind(this));
    }
    TextAreaSurface.prototype = Object.create(Surface.prototype);
    TextAreaSurface.prototype.constructor = TextAreaSurface;

    TextAreaSurface.prototype.elementType = 'textarea';
    TextAreaSurface.prototype.elementClass = 'famous-surface';

    /**
     * Set placeholder text.  Note: Triggers a repaint.
     *
     * @method setPlaceholder
     * @param {string} str Value to set the placeholder to.
     * @return {TextAreaSurface} this, allowing method chaining.
     */
    TextAreaSurface.prototype.setPlaceholder = function setPlaceholder(str) {
        this._placeholder = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Focus on the current input, pulling up the keyboard on mobile.
     *
     * @method focus
     * @return {TextAreaSurface} this, allowing method chaining.
     */
    TextAreaSurface.prototype.focus = function focus() {
        if (this._currTarget) this._currTarget.focus();
        return this;
    };

    /**
     * Blur the current input, hiding the keyboard on mobile.
     *
     * @method focus
     * @return {TextAreaSurface} this, allowing method chaining.
     */
    TextAreaSurface.prototype.blur = function blur() {
        if (this._currTarget) this._currTarget.blur();
        return this;
    };

    /**
     * Set the placeholder conent.
     *   Note: Triggers a repaint next tick.
     *
     * @method setValue
     * @param {string} str Value to set the main input value to.
     * @return {TextAreaSurface} this, allowing method chaining.
     */
    TextAreaSurface.prototype.setValue = function setValue(str) {
        this._value = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Set the type of element to display conent.
     *   Note: Triggers a repaint next tick.
     *
     * @method setType
     * @param {string} str type of the input surface (e.g. 'button', 'text')
     * @return {TextAreaSurface} this, allowing method chaining.
     */
    TextAreaSurface.prototype.setType = function setType(str) {
        this._type = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the value of the inner content of the element (e.g. the entered text)
     *
     * @method getValue
     * @return {string} value of element
     */
    TextAreaSurface.prototype.getValue = function getValue() {
        if (this._currTarget) {
            return this._currTarget.value;
        } else if(this._currentTarget){
            return this._currentTarget.value;
        } else {
            return this._value;
        }
    };

    /**
     * Set the name attribute of the element.
     *   Note: Triggers a repaint next tick.
     *
     * @method setName
     * @param {string} str element name
     * @return {TextAreaSurface} this, allowing method chaining.
     */
    TextAreaSurface.prototype.setName = function setName(str) {
        this._name = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the name attribute of the element.
     *
     * @method getName
     * @return {string} name of element
     */
    TextAreaSurface.prototype.getName = function getName() {
        return this._name;
    };

    /**
     * Place the document element this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    TextAreaSurface.prototype.deploy = function deploy(target) {
        if (this._placeholder !== '') target.placeholder = this._placeholder;
        target.value = this._value;
        target.type = this._type;
        target.name = this._name;
    };

    module.exports = TextAreaSurface;
});
