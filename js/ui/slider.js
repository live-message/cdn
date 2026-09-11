import { SPA } from "../utils/spa.js";
const ATTR = 'data-ui-slider';

class SliderInput extends HTMLElement {
  static get observedAttributes() { return ['checked']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._checked = false;
  }

  connectedCallback() {
    if (!this.shadowRoot.innerHTML) this.render();
    this._checked = this.hasAttribute('checked');
    this.updateVisuals();

    this.addEventListener('click', this.toggle.bind(this));
    this.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'checked') {
      this._checked = newVal !== null;
      this.updateVisuals();
    }
  }

  get checked() { return this._checked; }
  set checked(val) {
    const bool = Boolean(val);
    if (bool !== this._checked) {
      this._checked = bool;
      bool ? this.setAttribute('checked', '') : this.removeAttribute('checked');
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  toggle() {
    this.checked = !this.checked;
  }

  updateVisuals() {
    const track = this.shadowRoot.querySelector('.track');
    const thumb = this.shadowRoot.querySelector('.thumb');
    if (!track) return;

    track.style.background = this._checked ? '#6c5ce7' : '#3a3a52';
    thumb.style.transform = this._checked ? 'translateX(24px)' : 'translateX(0)';
    this.setAttribute('aria-checked', String(this._checked));
  }

  render() {
    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    width: 52px;
                    height: 28px;
                    cursor: pointer;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                    outline: none;
                }
                .track {
                    width: 100%;
                    height: 100%;
                    border-radius: 14px;
                    background: #3a3a52;
                    position: relative;
                    transition: background 0.3s ease;
                }
                .thumb {
                    width: 24px;
                    height: 24px;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), width 0.2s ease;
                }
                /* Эффект зажатия (растяжение) */
                :host(:active) .thumb { width: 28px; }
                :host(:active[checked]) .thumb { transform: translateX(20px); }
            </style>
            <div class="track"><div class="thumb"></div></div>
        `;
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'switch');
  }
}

if (!customElements.get('input-slider')) {
  customElements.define('input-slider', SliderInput);
}


export function initSlider(container) {
  const inputs = container.matches?.(`input[type="slider"]`)
    ? [container]
    : container.querySelectorAll?.(`input[type="slider"]`) || [];

  inputs.forEach(input => {
    if (input.__upgradedToSlider) return;

    const custom = document.createElement('input-slider');

    if (input.hasAttribute('checked')) custom.setAttribute('checked', '');
    if (input.id) custom.id = input.id;
    if (input.name) custom.setAttribute('name', input.name);
    if (input.className) custom.className = input.className;

    Array.from(input.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        custom.setAttribute(attr.name, attr.value);
      }
    });

    custom.__upgradedToSlider = true;
    input.replaceWith(custom);
  });
}
SPA((node) => {
  initSlider(node);
}, {
  selector: 'input[type="slider"]',
  continuous: true
});
