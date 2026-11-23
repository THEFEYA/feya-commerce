import {colorChoiceStyle} from '@/lib/bonanzaColorChoices';
import type {OwnerCartPreviewItem} from '@/lib/commerceOwnerCartReview';
import type {CartColourChoice, CartColourRecovery} from '@/lib/payments/cartColourRecovery';

type Props = {
  item: OwnerCartPreviewItem;
  recovery: CartColourRecovery;
  onChoose: (choice: CartColourChoice, menChoice?: CartColourChoice) => void;
};

const control = 'min-h-11 max-w-full rounded-lg border border-white/25 bg-[#141418] px-3 text-[13px] text-[#f7f3ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]';
const money = new Intl.NumberFormat('en-IE', {style: 'currency', currency: 'EUR'});

export function CartSavedColourPicker({item, recovery, onChoose}: Props) {
  const {choices} = recovery;
  const pair = item.paired_selection;
  function caption(choice: CartColourChoice) {
    return choice.unit_minor === Math.round(item.price * 100) ? choice.label :
      choice.label + ' · ' + money.format(choice.unit_minor / 100) + ' each';
  }
  return <div id="saved-bag-colour" className="mt-3 min-w-0 scroll-mt-24 rounded-lg border border-[#d4b26a]/40 p-3">
    <p role="status" className="text-[13px] leading-5 text-[#f7f3ec]">
      {choices.length ? 'A saved colour is no longer available. Choose a replacement for this piece.' :
        'This piece has no available replacement colour. Remove it to continue with your other pieces.'}
    </p>
    {choices.length > 0 && (pair ? <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const women = choices.find(choice => choice.code === fields.get('women'));
      const men = choices.find(choice => choice.code === fields.get('men'));
      if (women && men) onChoose(women, men);
    }}>
      {(['women','men'] as const).map(partner => <label key={partner} className="grid min-w-0 gap-1 text-[12px] text-[var(--bone-dim)]">
        {partner === 'women' ? "Women's colour" : "Men's colour"}
        <select required className={control} name={partner}
          defaultValue={choices.some(choice => choice.code === pair[partner].color) ? pair[partner].color : ''}>
          <option value="">Choose a colour</option>
          {choices.map(choice => <option key={choice.code} value={choice.code}>{caption(choice)}</option>)}
        </select>
      </label>)}
      <button type="submit" className={control}>Update colours</button>
    </form> : choices.length > 4 ? <label className="mt-2 block">
      <span className="sr-only">Replacement colour</span>
      <select className={control} defaultValue="" onChange={event => {
        const selected = choices.find(choice => choice.code === event.target.value);
        if (selected) onChoose(selected);
      }}>
        <option value="">Choose a colour</option>
        {choices.map(choice => <option key={choice.code} value={choice.code}>{caption(choice)}</option>)}
      </select>
    </label> : <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Replacement colour">
      {choices.map(choice => <button type="button" key={choice.code} onClick={() => onChoose(choice)}
        className={control + ' inline-flex items-center gap-2 hover:border-[#d4b26a]'}>
        <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/25" style={colorChoiceStyle(choice.code)}/>
        {caption(choice)}
      </button>)}
    </div>)}
  </div>;
}
