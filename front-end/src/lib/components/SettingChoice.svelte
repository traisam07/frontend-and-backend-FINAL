<!-- src/lib/components/SettingChoice.svelte
     CANONICAL DECLARATION — this file.

     A labelled row of two or three mutually-exclusive display options. Three uses — theme, text
     size, text weight — so it is one component rather than three hand-written segmented controls
     (`docs/LESSONS.md` L-067: the 44px floor and the focus ring are safety requirements, and
     re-typing them per call site is how one of them goes missing).

     A RADIOGROUP, not a row of toggle buttons. These are mutually exclusive, exactly one is always
     on, and `radiogroup` is what tells a screen-reader user "2 of 3" instead of leaving them to
     press each in turn to discover which is active. Native `<input type="radio">` inside a `<label>`
     gives arrow-key movement and grouping for free; a `role="radio"` reimplementation would owe all
     of that by hand.

     The options carry TEXT, never an icon alone. A weight or a size shown only as a glyph is a
     control whose meaning a clinician has to learn; these say `Default`, `Large`, `Larger`. -->
<script lang="ts" generics="T extends string">
  let {
    label,
    value,
    options,
    onchange,
  }: {
    label: string;
    value: T;
    options: ReadonlyArray<{ value: T; label: string }>;
    onchange: (next: T) => void;
  } = $props();

  const uid = $props.id();
</script>

<!-- `role="radiogroup"` is explicit rather than implied: a bare `<fieldset>` maps to `group`, and
     the radiogroup role is what makes a screen reader announce "2 of 3" as the user arrows through. -->
<fieldset role="radiogroup" aria-label={label} class="flex min-w-0 flex-col gap-1.5">
  <legend class="text-micro font-semibold tracking-[0.04em] text-fg-muted uppercase">
    {label}
  </legend>

  <div class="flex min-w-0 gap-0.5 rounded-md border border-border-strong bg-surface-sunken p-0.5">
    {#each options as option (option.value)}
      {@const id = `${uid}-${option.value}`}
      {@const active = value === option.value}
      <input
        {id}
        type="radio"
        name={uid}
        class="peer sr-only"
        checked={active}
        onchange={() => onchange(option.value)}
      />
      <label
        for={id}
        class={[
          'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-sm px-2 text-sm font-semibold',
          'peer-focus-visible:pm-focus',
          active
            ? 'border border-b-2 border-border border-b-accent-solid bg-surface text-fg shadow-card'
            : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
        ]}
      >
        {option.label}
      </label>
    {/each}
  </div>
</fieldset>
