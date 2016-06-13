import {Component, Directive, ElementRef, EventEmitter, HostBinding, Input, Optional, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {NgControl} from '@angular/common';

import {Config} from '../../config/config';
import {isPresent} from '../../util/util';


/**
* @private
*/
@Directive({
  selector: '.searchbar-input',
})
export class SearchbarInput {
  constructor(public elementRef: ElementRef) {}
}


/**
 * @name Searchbar
 * @module ionic
 * @description
 * Manages the display of a Searchbar which can be used to search or filter items.
 *
 * @usage
 * ```html
 * <ion-searchbar
 *   [(ngModel)]="myInput"
 *   [hideCancelButton]="shouldHideCancel"
 *   (ionInput)="onInput($event)"
 *   (ionCancel)="onCancel($event)">
 * </ion-searchbar>
 * ```
 *
 * @demo /docs/v2/demos/searchbar/
 * @see {@link /docs/v2/components#searchbar Searchbar Component Docs}
 */
@Component({
  selector: 'ion-searchbar',
  host: {
    '[class.searchbar-has-value]': '_value',
    '[class.searchbar-hide-cancel]': 'hideCancelButton'
  },
  template:
    '<div class="searchbar-input-container">' +
      '<button (click)="cancelSearchbar($event)" (mousedown)="cancelSearchbar($event)" [hidden]="hideCancelButton" clear dark class="searchbar-md-cancel">' +
        '<ion-icon name="arrow-back"></ion-icon>' +
      '</button>' +
      '<div #searchbarIcon class="searchbar-search-icon"></div>' +
      '<input [(ngModel)]="_value" [attr.placeholder]="placeholder" (input)="inputChanged($event)" (blur)="inputBlurred($event)" (focus)="inputFocused($event)" class="searchbar-input">' +
      '<button clear class="searchbar-clear-icon" (click)="clearInput($event)" (mousedown)="clearInput($event)"></button>' +
    '</div>' +
    '<button clear (click)="cancelSearchbar($event)" (mousedown)="cancelSearchbar($event)" [hidden]="hideCancelButton" class="searchbar-ios-cancel">{{cancelButtonText}}</button>',
  directives: [SearchbarInput],
  encapsulation: ViewEncapsulation.None
})
export class Searchbar {
  private _value: string|number = '';
  private _tmr: any;
  private _shouldBlur: boolean = true;

  private inputEle: any;
  private iconEle: any;
  private mode: string;

  /**
   * @input {string} Set the the cancel button text. Default: `"Cancel"`.
   */
  @Input() cancelButtonText: string = 'Cancel';

  /**
   * @input {boolean} Whether to hide the cancel button or not. Default: `"false"`.
   */
  @Input() hideCancelButton: any = false;

  /**
   * @input {number} How long, in milliseconds, to wait to trigger the `input` event after each keystroke. Default `250`.
   */
  @Input() debounce: number = 250;

  /**
   * @input {string} Set the input's placeholder. Default `"Search"`.
   */
  @Input() placeholder: string = 'Search';

  /**
   * @input {string} Set the input's autocomplete property. Values: `"on"`, `"off"`. Default `"off"`.
   */
  @Input() autocomplete: string;

  /**
   * @input {string} Set the input's autocorrect property. Values: `"on"`, `"off"`. Default `"off"`.
   */
  @Input() autocorrect: string;

  /**
   * @input {string|boolean} Set the input's spellcheck property. Values: `true`, `false`. Default `false`.
   */
  @Input() spellcheck: string|boolean;

  /**
   * @input {string} Set the type of the input. Values: `"text"`, `"password"`, `"email"`, `"number"`, `"search"`, `"tel"`, `"url"`. Default `"search"`.
   */
  @Input() type: string = 'search';

  /**
   * @output {event} When the Searchbar input has changed including cleared.
   */
  @Output() ionInput: EventEmitter<UIEvent> = new EventEmitter();

  /**
   * @output {event} When the Searchbar input has blurred.
   */
  @Output() ionBlur: EventEmitter<UIEvent> = new EventEmitter();

  /**
   * @output {event} When the Searchbar input has focused.
   */
  @Output() ionFocus: EventEmitter<UIEvent> = new EventEmitter();

  /**
   * @output {event} When the cancel button is clicked.
   */
  @Output() ionCancel: EventEmitter<UIEvent> = new EventEmitter();

  /**
   * @output {event} When the clear input button is clicked.
   */
  @Output() ionClear: EventEmitter<UIEvent> = new EventEmitter();

  /**
   * @private
   */
  @HostBinding('class.searchbar-has-focus') isFocused: boolean;

  /**
   * @private
   */
  @HostBinding('class.searchbar-left-aligned') shouldLeftAlign: boolean;

  constructor(
    private _elementRef: ElementRef,
    private _config: Config,
    @Optional() ngControl: NgControl
  ) {
    // If the user passed a ngControl we need to set the valueAccessor
    if (ngControl) {
      ngControl.valueAccessor = this;
    }
  }

  /**
   * @private
   */
  @ViewChild(SearchbarInput)
  private set _searchbarInput(searchbarInput: SearchbarInput) {
    this.inputEle = searchbarInput.elementRef.nativeElement;

    // By defalt set autocomplete="off" unless specified by the input
    let autoComplete = (this.autocomplete === '' || this.autocomplete === 'on') ? 'on' : this._config.get('autocomplete', 'off');
    this.inputEle.setAttribute('autocomplete', autoComplete);

    // by default set autocorrect="off" unless specified by the input
    let autoCorrect = (this.autocorrect === '' || this.autocorrect === 'on') ? 'on' : this._config.get('autocorrect', 'off');
    this.inputEle.setAttribute('autocorrect', autoCorrect);

    // by default set spellcheck="false" unless specified by the input
    let spellCheck = (this.spellcheck === '' || this.spellcheck === 'true' || this.spellcheck === true) ? true : this._config.getBoolean('spellcheck', false);
    this.inputEle.setAttribute('spellcheck', spellCheck);

    // by default set type="search" unless specified by the input
    this.inputEle.setAttribute('type', this.type);
  }

  @ViewChild('searchbarIcon') _searchbarIcon: ElementRef;

  /**
   * @input {string} Set the input value.
   */
  @Input()
  get value() {
    return this._value;
  }

  set value(val) {
    this._value = val;
  }

  /**
   * @private
   * On Initialization check for attributes
   */
  ngOnInit() {
    this.mode = this._config.get('mode');

    let hideCancelButton = this.hideCancelButton;
    if (typeof hideCancelButton === 'string') {
      this.hideCancelButton = (hideCancelButton === '' || hideCancelButton === 'true');
    }

    this.shouldLeftAlign = this._value && this._value.toString().trim() !== '';
  }

  /**
   * @private
   * After View Initialization check the value
   */
  ngAfterViewInit() {
    this.iconEle = this._searchbarIcon.nativeElement;
    this.setElementLeft();
  }

  /**
   * @private
   * Determines whether or not to add style to the element
   * to center it properly (ios only)
   */
  setElementLeft() {
    if (this.mode !== 'ios') return;

    if (this.shouldLeftAlign) {
      this.inputEle.removeAttribute('style');
      this.iconEle.removeAttribute('style');
    } else {
      this.addElementLeft();
    }
  }

  /**
   * @private
   * Calculates the amount of padding/margin left for the elements
   * in order to center them based on the placeholder width
   */
  addElementLeft() {
    // Create a dummy span to get the placeholder width
    let tempSpan = document.createElement('span');
    tempSpan.innerHTML = this.placeholder;
    document.body.appendChild(tempSpan);

    // Get the width of the span then remove it
    let textWidth = tempSpan.offsetWidth;
    tempSpan.remove();

    // Set the input padding left
    let inputLeft = 'calc(50% - ' + (textWidth / 2) + 'px)';
    this.inputEle.style.paddingLeft = inputLeft;

    // Set the icon margin left
    let iconLeft = 'calc(50% - ' + ((textWidth / 2) + 30) + 'px)';
    this.iconEle.style.marginLeft = iconLeft;
  }

  /**
   * @private
   * Update the Searchbar input value when the input changes
   */
  inputChanged(ev: any) {
    let value = ev.target.value;

    clearTimeout(this._tmr);
    this._tmr = setTimeout(() => {
      this._value = value;
      this.onChange(this._value);
      this.ionInput.emit(ev);
    }, Math.round(this.debounce));
  }

  /**
   * @private
   * Sets the Searchbar to focused and aligned left on input focus.
   */
  inputFocused(ev: UIEvent) {
    this.ionFocus.emit(ev);

    this.isFocused = true;
    this.shouldLeftAlign = true;
    this.setElementLeft();
  }

  /**
   * @private
   * Sets the Searchbar to not focused and checks if it should align left
   * based on whether there is a value in the searchbar or not.
   */
  inputBlurred(ev: UIEvent) {
    // _shouldBlur determines if it should blur
    // if we are clearing the input we still want to stay focused in the input
    if (this._shouldBlur === false) {
      this.inputEle.focus();
      this._shouldBlur = true;
      return;
    }
    this.ionBlur.emit(ev);

    this.isFocused = false;
    this.shouldLeftAlign = this._value && this._value.toString().trim() !== '';
    this.setElementLeft();
  }

  /**
   * @private
   * Clears the input field and triggers the control change.
   */
  clearInput(ev: UIEvent) {
    this.ionClear.emit(ev);

    if (isPresent(this._value) && this._value !== '') {
      this._value = '';
      this.onChange(this._value);
      this.ionInput.emit(ev);
    }

    this._shouldBlur = false;
  }

  /**
   * @private
   * Clears the input field and tells the input to blur since
   * the clearInput function doesn't want the input to blur
   * then calls the custom cancel function if the user passed one in.
   */
  cancelSearchbar(ev: UIEvent) {
    this.ionCancel.emit(ev);

    this.clearInput(ev);
    this._shouldBlur = true;
  }

  /**
   * @private
   * Write a new value to the element.
   */
  writeValue(val: any) {
    this._value = val;
  }

  /**
   * @private
   */
  onChange = (_: any) => {};

  /**
   * @private
   */
  onTouched = () => {};

  /**
   * @private
   * Set the function to be called when the control receives a change event.
   */
  registerOnChange(fn: (_: any) => {}): void {
    this.onChange = fn;
  }

  /**
   * @private
   * Set the function to be called when the control receives a touch event.
   */
  registerOnTouched(fn: () => {}): void {
    this.onTouched = fn;
  }
}