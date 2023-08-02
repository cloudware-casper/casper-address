import { LitElement, html, css } from 'lit';
import '@polymer/paper-input/paper-input.js';
import { CasperUiHelperMixin } from '@cloudware-casper/casper-edit-dialog/components/casper-ui-helper-mixin.js';
import '@cloudware-casper/casper-select-lit/casper-select-lit.js';
import '@cloudware-casper/casper-select-lit/components/casper-highlightable.js';


class CasperAddress extends CasperUiHelperMixin(LitElement) {
  static styles = [
    css`
      :host {
        --ca-grid-gap: 1rem;
        display: grid;
        width: 100%;
        grid-template-columns: repeat(6, 1fr);
        grid-gap: var(--ca-grid-gap);
      }

      :host(.postal-code) {
        grid-template-columns: repeat(4, 1fr);
      }

      :host(.postal-code-country) {
        grid-template-columns: repeat(4, 1fr);
      }

      :host(.postal-code-country) #address-country {
        grid-column: span 4;
      }

      * {
        grid-column: span 2;
      }

      #address-name {
        /* Necessary for the transition */
        -webkit-order: -1;
        order: -1;
      }

      #address-name,
      #address-search {
        grid-column: span 3;
        transition: all 0.5s ease-in-out;
      }

      #address-search {
        position: relative;
        width: 100%;
        left: 0;
      }

      #address-name {
        width: 100%;
        opacity: 1;
      }

      #address-search:hover,
      #address-search:focus {
        width: calc(200% + var(--ca-grid-gap));
        left: calc(-100% - var(--ca-grid-gap));
      }

      #address-search:hover + #address-name,
      #address-search:focus + #address-name {
        width: 0;
        opacity: 0;
        pointer-events: none;
      }

      #address-detail {
        grid-column: 1 / -1;
      }
    `
  ];

  static properties = {
    addressId:          { type: Number},
    addressDetail:      { type: String },
    name:               { type: String },
    postcode:           { type: String },
    city:               { type: String },
    country:            { type: String },
    mode:               { type: String },
    countriesArray:     { type: Array },
    countriesResource:  { type: String },
    addressesResource:  { type: String },
    isPrimaryAddress:   { type: Boolean },
    modePostalCode:     { type: String }
  };

  constructor () {
    super();
    this._socket = app.socket2;
    if (!this.addressesResource) {
      this.addressesResource = 'addresses';
    }
    this.fitInto = window.document.documentElement;
    this.isPrimaryAddress = false;
  }

  firstUpdated () {
    if (this.modePostalCode == 'postal-code') {
      this.classList.add("postal-code")
      this._addressPostcodeInput = this.shadowRoot.getElementById('postal-code-search');
      this._addressCityInput     = this.shadowRoot.getElementById('address-city');
    } else if (this.modePostalCode == 'postal-code-country') {
      this.classList.add("postal-code-country")
      this._addressPostcodeInput = this.shadowRoot.getElementById('address-postcode');
      this._addressCityInput     = this.shadowRoot.getElementById('address-city');
      this._addressCountryInput  = this.shadowRoot.getElementById('address-country');
    } else {
      this._addressNameInput     = this.shadowRoot.getElementById('address-name');
      this._addressSearchInput   = this.shadowRoot.getElementById('address-search');
      this._addressDetailInput   = this.shadowRoot.getElementById('address-detail');
      this._addressPostcodeInput = this.shadowRoot.getElementById('address-postcode');
      this._addressCityInput     = this.shadowRoot.getElementById('address-city');
      this._addressCountryInput  = this.shadowRoot.getElementById('address-country');
      this.loadAddress();
    }

    this.loadCountries();

    this.addEventListener('keydown', this._keydownHandler.bind(this));
  }

  updated (changedProperties) {
    if (changedProperties.has('countriesArray') || changedProperties.has('country')) {
      if (this?.country) this._addressCountryInput.setValue(this.country);
    }
    if (changedProperties.has('addressId') || changedProperties.has('addressesResource')) {
      this.loadAddress();
    }
  }

  render () {
    if (this.modePostalCode == 'postal-code') {
      return html `
        <casper-select-lit
          id="postal-code-search"
          label="Código Postal *"
          required
          alwaysFloatLabel
          highlight
          filterOnly
          .socket="${this._socket}"
          .fitInto="${this.fitInto}"
          .renderLine="${this._renderLinePostalCodes}"
          idColumn="id"
          textProp="cp"
          tableSchema="common"
          tableName="pc_postal_codes"
          .lazyLoadFilterFields="${['cp']}"
          lazyLoadResource="postal_codes_cp"
          @change="${this._selectPostalCode}"
        >
        </casper-select-lit>

        <paper-input
          id="address-city"
          type="text"
          label="Localidade"
          .value=${this.city}
          disabled>
        </paper-input>
      `
    } else if (this.modePostalCode == 'postal-code-country') {
      return html `
        <paper-input
          id="address-postcode"
          type="text"
          label="Código Postal *"
          .value=${this.postcode}
          required>
        </paper-input>

        <paper-input
          id="address-city"
          type="text"
          label="Localidade"
          .value=${this.city}>
        </paper-input>

        <casper-select-lit
          id="address-country"
          disableClear
          label="Pais / Região *"
          highlight
          required
          .items=${this.countriesArray}
          .renderLine="${this._renderLineCountry}"
          .fitInto="${this.fitInto}"
        >
        </casper-select-lit>
      `
    } else {
      return html `
        <casper-select-lit
          id="address-search"
          label="Pesquisa por rua / código postal / localidade"
          alwaysFloatLabel
          highlight
          filterOnly
          useTsvFilter
          .hidden="${this.mode == 'basic' ? true : false}"
          .socket="${this._socket}"
          .renderLine="${this._renderLineAddress}"
          .fitInto="${this.fitInto}"
          idColumn="id"
          textProp="street_name"
          tableSchema="common"
          sortColumn="cp"
          tableName="pc_streets"
          lazyLoadResource="postal_codes_streets"
          @change="${this._selectAddress}"
          no-autofocus>
          <casper-icon icon="fa-regular:search" slot="cs-prefix"></casper-icon>
        </casper-select-lit>

        <paper-input
          id="address-name"
          label="Designação da morada *"
          type="text"
          .value=${this.name}
          ?disabled=${this.isPrimaryAddress}
          required>
        </paper-input>

        <paper-input
          id="address-detail"
          type="text"
          label="Morada"
          .value=${this.addressDetail}>
        </paper-input>

        <paper-input
          id="address-postcode"
          type="text"
          label="Código Postal"
          .value=${this.postcode}>
        </paper-input>

        <paper-input
          id="address-city"
          type="text"
          label="Localidade"
          .value=${this.city}>
        </paper-input>

        <casper-select-lit
          id="address-country"
          disableClear
          label="Pais / Região *"
          required
          highlight
          .items=${this.countriesArray}
          .renderLine="${this._renderLineCountry}"
          .fitInto="${this.fitInto}"
          @change="${this._onChangeCountry}">
        </casper-select-lit>
      `
    }
  }

  //***************************************************************************************//
  //                              ~~~ Public methods  ~~~                                  //
  //***************************************************************************************//

  async loadCountries () {
    if (!this.countriesArray && this.countriesResource) {
      this.countriesArray = await this._getCountriesList();
    }
  }

  async loadAddress () {
    if (this.addressId) {
      try {
        const {data} = await app.broker.get(`${this.addressesResource}/${this.addressId}`, 3000);
        this.setValues(data);
      } catch (e) {
        console.error(e);
      }
    }
  }

  async setValues (data) {
    if (!data) return;

    await this.updateComplete;

    if (data?.name) this.name = data.name;
    if (data?.address_detail) this.addressDetail = data.address_detail;
    if (data?.postcode) this.postcode = data.postcode;
    if (data?.city) this.city = data.city;
    if (data?.is_primary) this.isPrimaryAddress = data.is_primary;
    if (data?.country) this._addressCountryInput?.setValue(data?.country);
    if (data?.relationships?.country?.data?.id) this._addressCountryInput?.setValue(data.relationships.country.data.id);
  }

  getAddressData () {
    if (this.modePostalCode == 'postal-code') {
      return {
        'postcode': this.postcode ? this.postcode : null,
        'city': this._addressCityInput?.value,
      }
    } else if (this.modePostalCode == 'postal-code-country') {
      return {
        'postcode': this._addressPostcodeInput?.value ? this._addressPostcodeInput?.value : null,
        'city': this._addressCityInput?.value,
        'country': this._addressCountryInput?.value
      }
    } else {
      return {
        'name': this._addressNameInput?.value,
        'address_detail': this._addressDetailInput?.value,
        'postcode': this._addressPostcodeInput?.value ? this._addressPostcodeInput?.value : null,
        'city': this._addressCityInput?.value,
        'country': this._addressCountryInput?.value
      }
    }
  }

  /* Validates fields which have the "required" attribute. */
  validateRequiredFields () {
    let isValid = true;
    const requiredFields = this.shadowRoot.querySelectorAll('[required]');

    for (const element of requiredFields) {
      if (!element.hasAttribute('has-keydown-listener')) {
        element.addEventListener('keydown', (event) => this.clearFieldErrorMessage(event?.currentTarget));
        element.setAttribute('has-keydown-listener', '');
      }

      const nodeName = element.nodeName.toLowerCase();
      const message = 'Campo obrigatório.';

      switch (nodeName) {
        case 'casper-select-lit':
          if (element.value === undefined) {
            element.searchInput.invalid = true;
            element.error = message;
            isValid = false;
          }
          break;

        case 'casper-select':
          if (!element.value) {
            if (element.multiSelection) {
              const paperInputContainer = element.shadowRoot.querySelector('paper-input-container');
              if (paperInputContainer) paperInputContainer.invalid = true;
            } else {
              element.searchInput.invalid = true;
              element.searchInput.errorMessage = message;
            }

            isValid = false;
          }
          break;

        case 'casper-date-picker':
          if (!element.value) {
            element.invalid = true;
            element.requiredErrorMessage = message;
            element.__errorMessage = message;
            isValid = false;
          }
          break;

        case 'paper-checkbox':
          if (!element.checked) {
            element.invalid = true;
            isValid = false;
          }
          break;

        case 'paper-input':
          if ((!element.value && element.value !== 0) || element.value?.toString()?.trim() === '') {
            element.invalid = true;
            element.errorMessage = message;
            isValid = false;
          }
          break;

        default:
          break;
      }
    }

    return isValid;
  }

  validate () {
    let isValid = true;

    const requiredValidations = this.validateRequiredFields();
    const otherValidations = this._validate();

    if (!requiredValidations || !otherValidations) isValid = false;

    return isValid;
  }

  /* Event listener which is fired when the user interacts with an invalid field. This will clear the error message. */
  clearFieldErrorMessage (element) {
    if (!element) return;
    const nodeName = element.nodeName.toLowerCase();

    switch (nodeName) {
      case 'casper-select-lit':
        if (element.searchInput?.invalid) {
          element.searchInput.invalid = false;
          element.error = '';
        }
        break;

      case 'casper-select':
        if (element.multiSelection) {
          const paperInputContainer = element.shadowRoot.querySelector('paper-input-container');
          if (paperInputContainer?.invalid) paperInputContainer.invalid = false;
        } else {
          if (element.searchInput?.invalid) {
            element.searchInput.invalid = false;
            element.searchInput.errorMessage = '';
          }
        }
        break;

      case 'casper-date-picker':
        if (element.invalid) {
          element.invalid = false;
          element.__errorMessage = '';
        }
        break;

      case 'paper-checkbox':
        if (element.invalid) {
          element.invalid = false;
        }
        break;

      case 'paper-input':
        if (element.invalid) {
          element.invalid = false;
          element.errorMessage = '';
        }
        break;

      default:
        break;
    }
  }

  //***************************************************************************************//
  //                              ~~~ Private methods  ~~~                                 //
  //***************************************************************************************//

  _renderLineAddress (item, search) {
    return html `
      <style>
        .cvs__item-row {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        .line-container {
          display: flex;
          flex-direction: column;
          gap: 0.357em;
          padding: 0.7em 0;
          border-bottom: 1px solid #ddd;
        }

        .line-container .wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.357em;
        }

        .line-container .address {
          font-size: calc(var(--cvs-font-size) - 1px);
          font-weight: 300;
        }

        .line-container .section {
          --section-bg-color-rgb: 237, 237, 237;
          background-color: rgb(var(--section-bg-color-rgb));
          color: rgb(143, 143, 143);
          font-size: calc(var(--cvs-font-size) - 3px);
          padding: 0.272em 0.454em;
          border-radius: 0.272em;
          font-weight: 400;
          text-transform: uppercase;
        }

        .cvs__item-row:hover .line-container .section,
        .cvs__item-row[active] .line-container .section {
          background-color: rgba(var(--section-bg-color-rgb), 0.4);
          color: #FFF;
        }
      </style>

      <div class="line-container">
        <div class="wrapper">
          <casper-highlightable highlight="${search}">
            ${item.street_name}
          </casper-highlightable>
          ${item.section ? html`<span class="section">${item.section}</span>` : ''}
        </div>

        <casper-highlightable highlight="${search}" class="address">
          ${item.cp} ${item.locality_name} - ${item.district_name}
        </casper-highlightable>
      </div>
    `;
  }

  _renderLineCountry (item, search) {
    return html`
      <style>
        .country-name {
          padding-left: 10px;
        }
      </style>
      <div class="country-name">
        <casper-highlightable highlight="${search}">${item.name}</casper-highlightable>
      </div>
    `;
  }

  _renderLinePostalCodes (item, search) {
    return html`
     <style>
        .line-container {
          min-width: 200px;
          padding: 5px 0px;
          border-bottom: 1px solid #ddd;
          display: grid;
          grid-templates-rows: auto auto;
        }

        .line-container > .address {
          margin: 0px;
          margin-top: 5px;
          font-size: calc(var(--cvs-font-size) - 1px);
          margin-bottom: 5px;
          font-weight: 300;
          letter-spacing: .5px;
        }
      </style>

      <div class="line-container">
        <casper-highlightable highlight="${search}">
          ${item.cp4}-${item.cp3}
        </casper-highlightable>
        <casper-highlightable highlight="${search}" class="address">
          ${item.cpalf}
        </casper-highlightable>
      </div>
    `;
  }

  async _getCountriesList () {
    const countriesResponse = await app.broker.get(this.countriesResource, 3000);
    countriesResponse.data.sort((a, b) => {
      const firstValue = a.tax_country_region.toUpperCase();
      const secondValue = b.tax_country_region.toUpperCase();

      if (secondValue === 'PT' || secondValue === 'PT-AC' || secondValue === 'PT-MA') {
        return 1;
      } else if (firstValue === 'PT' || firstValue === 'PT-AC' || firstValue === 'PT-MA') {
        return -1;
      } else if (firstValue > secondValue) {
        return -1;
      } else if (firstValue < secondValue) {
        return 1;
      } else {
        return 0;
      }
    });

    const countriesArray = countriesResponse.data.map((eachObj) => {
      return {
        id: eachObj.id,
        name: eachObj.default_name,
        iso_alpha_3: eachObj.iso_alpha_3,
        iso_alpha_2: eachObj.iso_alpha_2,
      };
    });

    let t1_done = false;
    let t2_done = false;
    let t3_done = false;
    countriesResponse.data.forEach((element, idx) => {
      if (element.tax_country_region.toUpperCase() === 'PT' && !t1_done) {
        countriesArray.splice(idx, 0, {separator: true, name:'Mercado nacional'});
        t1_done = true;
      } else if (element.tax_country_region.toUpperCase() === 'UE' && !t2_done) {
        countriesArray.splice(idx+1, 0, {separator: true, name:'Mercado comunitário'});
        t2_done = true;
      } else if (element.tax_country_region.toUpperCase() === 'NON-UE' && !t3_done) {
        countriesArray.splice(idx+2, 0, {separator: true, name:'Mercado extra-comunitário'});
        t3_done = true;
      }
    });

    return countriesArray;
  }

  _onChangeCountry (event) {
    if (!event.detail?.item?.iso_alpha_3) return;
    const isoAlpha = event.detail?.item?.iso_alpha_3;
    const alphaToCompare = 'PRT';

    if (isoAlpha && isoAlpha !== alphaToCompare) {
      this.mode = 'basic'
    } else {
      this.mode = 'complete'
    }
  }

  _selectAddress (event) {
    const item = event?.detail?.item;
    if (!item) return;

    this._addressDetailInput.value   = item?.street_name;
    this._addressPostcodeInput.value = item?.cp;
    this._addressCityInput.value     = item?.locality_name;
    this._selectCountry(item?.cp4);
    this._addressSearchInput.clearValue();
  }

  _selectCountry (cp4) {
    if (!cp4) return;

    const azoresPostalCodes = ['9930','9950','9940','9850','9800','9700','9760','9900','9880'];
    const madeiraPostalCodes = ['9000','9004','9020','9024','9030','9050','9054','9060','9064','9100','9125','9125','9135','9200','9225','9230','9240','9270','9300','9304','9325','9350','9360','9370','9374','9385'];
    if (azoresPostalCodes.includes(cp4)) {
      this._addressCountryInput?.setValue(3);
    } else if (madeiraPostalCodes.includes(cp4)) {
      this._addressCountryInput?.setValue(2);
    } else {
      this._addressCountryInput?.setValue(1); // 1 - Portugal Continental, 2 - Portugal Madeira, 3 - Portugal Acores
    }
  }

  _selectPostalCode (event) {
    const item = event?.detail?.item;
    if (!item) return;

    this._addressCityInput.value = item?.locality_name;
    this.postcode = item?.cp;
  }

  _keydownHandler (event) {
    if (!event) return;

    if (event.key === 'Tab') {
      const children = Array.from(this.shadowRoot.children);
      const reachedLast = this.fieldTabHandler(event, children);

      if (reachedLast) {
        // Necessary for CasperEditDialog and other components, so that the next field is focused when the user presses tab
        this.dispatchEvent(new CustomEvent('reached-last-focusable-field', { bubbles: true, composed: true, cancelable: true, detail: { focusable_element: this } }));
      }
    }
  }

  _validate () {
    let isValid = true;

    if (this._addressCountryInput?.value && this._addressPostcodeInput?.value) {
      const selectedItem = this._addressCountryInput.items.find(item => item.id == this._addressCountryInput.value);

      if (selectedItem.iso_alpha_3?.toUpperCase() === 'PRT') {
        const ptPattern = /^\d{4}-\d{3}$/;

        if (!ptPattern.test(this._addressPostcodeInput.value)) {
          this._addressPostcodeInput.invalid = true;
          this._addressPostcodeInput.errorMessage = 'Código postal com formato inválido.';
          isValid = false;
        }
      }
    }

    return isValid;
  }
}

customElements.define('casper-address', CasperAddress);