// =====================================================
// CUSTOM FASHION STUDIO - script.js  (one clean file)
// Replace your whole old script.js with this.
// =====================================================

// ---------- SETTINGS ----------
// Paste your Web app URL (the one ending in /exec) between the quotes.
const ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzFN8kwuUrvZ5_TMz16RzgUeJMhK3UYT1C9TdOc6r9-v1gySZAmVoNFbtHeYgx4JS0t/exec';

// Orders from the Personalised Outfits section are saved under this name.
// (It should match the title of your "Custom Dresses" card.)
const PERSONALISED_PRODUCT = 'Custom Dresses';

// Picture rules (pictures are shrunk in the browser before they are sent)
const MAX_PICTURES = 12;           // most pictures in one order
const MAX_SIDE = 1000;             // longest side of a shrunk picture, in pixels
const MAX_PICTURE_CHARS = 900000;  // aim for pictures under roughly 650 KB each
const MAX_TOTAL_CHARS = 8000000;   // the biggest the whole order may be

// ---------- What the customer has chosen so far ----------
let chosenProduct = '';            // e.g. "Daily Frocks" (set when she taps a style button)
const lastSent = {};               // remembers the last order of each kind, so we never send it twice

// =====================================================
// PART 1: The summary box of the Customize steps
// =====================================================
const summaryText = document.getElementById('summary-text');

// a small "Continue to order" link inside a summary box (hidden until the design is saved)
function makeContinueLink(box) {
  if (!box) return null;
  const link = document.createElement('a');
  link.href = '#order';
  link.className = 'continue-link';
  link.hidden = true;
  box.appendChild(link);
  return link;
}

function showContinueLink(link, code) {
  if (!link) return;
  link.textContent = 'Design saved (' + code + ')  -  Continue to order \u2193';
  link.hidden = false;
}

const wizardContinue = makeContinueLink(summaryText.closest('.summary-box'));

function updateSummary() {
  const parts = [];

  if (chosenProduct) {
    parts.push('Style: ' + chosenProduct);
  }

  document.querySelectorAll('#customize .pill.selected').forEach(function (pill) {
    const group = pill.closest('.option-group');
    const title = group.querySelector('h3').textContent.trim();
    let choice = pill.textContent.trim();

    // For "Other", also say how many pictures were added
    if (pill.classList.contains('pill-other')) {
      const input = group.querySelector('.ref-input');
      const count = input ? input.files.length : 0;
      if (count > 0) {
        choice += ' (' + count + (count === 1 ? ' image' : ' images') + ')';
      }
    }

    parts.push(title + ': ' + choice);
  });

  if (parts.length === 0) {
    summaryText.textContent = 'Nothing selected yet. Pick your options above.';
  } else {
    summaryText.textContent = parts.join('  \u2022  ');
  }

  // the design changed, so it is no longer "saved"
  if (wizardContinue) {
    wizardContinue.hidden = true;
  }
}

// =====================================================
// PART 2: "How do you like your style?" buttons remember the dress
// =====================================================
document.querySelectorAll('.card a[href="#customize"]').forEach(function (button) {
  button.addEventListener('click', function () {
    chosenProduct = button.closest('.card').querySelector('h3').textContent.trim();
    updateSummary();
  });
});

document.querySelectorAll('.card a[href="#complete-customization"]').forEach(function (button) {
  button.addEventListener('click', function () {
    chosenProduct = PERSONALISED_PRODUCT;
    updateSummary();
  });
});


// =====================================================
// PART 3: Chips (one pick per group) and the "Other" upload
// =====================================================
const groups = document.querySelectorAll('#customize .option-group');

groups.forEach(function (group) {
  const pills = group.querySelectorAll('.pill');
  const uploadBox = group.querySelector('.upload-box');
  const input = group.querySelector('.ref-input');
  const preview = group.querySelector('.preview-area');

  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {

      // only one chip can be selected per group
      pills.forEach(function (p) {
        p.classList.remove('selected');
      });
      pill.classList.add('selected');

      // show the upload box only when "Other" is picked
      const isOther = pill.classList.contains('pill-other');
      if (uploadBox) {
        uploadBox.hidden = !isOther;
      }

      // if she moved away from "Other", clear its pictures
      if (!isOther && input) {
        input.value = '';
        preview.innerHTML = '';
      }

      updateSummary();
    });
  });

  // pictures chosen in this group's upload box
  if (input) {
    input.addEventListener('change', function () {
      showPreviews(input, preview);
      updateSummary();
    });
  }
});

// shows small thumbnails of the chosen pictures
function showPreviews(input, preview) {
  preview.innerHTML = '';

  Array.from(input.files).forEach(function (file) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = 'Reference image';
    preview.appendChild(img);
  });
}

// =====================================================
// PART 4: The step-by-step flow
// =====================================================
const optionGrid = document.querySelector('#customize .option-grid');
const stepLabel = document.getElementById('step-label');
const progressFill = document.getElementById('progress-fill');
const backBtn = document.getElementById('back-btn');
const nextBtn = document.getElementById('next-btn');

let currentStep = 0;
const lastStep = groups.length - 1;

function showStep(n) {
  currentStep = n;

  groups.forEach(function (group, i) {
    group.classList.toggle('active', i === n);
  });

  stepLabel.textContent = 'Step ' + (n + 1) + ' of ' + groups.length;
  progressFill.style.width = ((n + 1) / groups.length * 100) + '%';

  backBtn.style.visibility = (n === 0) ? 'hidden' : 'visible';
  nextBtn.textContent = (n === lastStep) ? 'Finish' : 'Next';
}

nextBtn.addEventListener('click', function () {
  if (currentStep < lastStep) {
    showStep(currentStep + 1);
  } else {
    submitWizard();         // the last step: save the design
  }
});

backBtn.addEventListener('click', function () {
  if (currentStep > 0) {
    showStep(currentStep - 1);
  }
});

optionGrid.classList.add('wizard-on');
showStep(0);

// =====================================================
// PART 5: Messages, the Order Code note, and the "Continue to order" pop-up
// =====================================================

// a message line that sits under a pair of Back/Next buttons
function makeStatusLine(buttonsRow) {
  if (!buttonsRow) return null;
  const line = document.createElement('p');
  line.className = 'order-status';
  line.hidden = true;
  buttonsRow.insertAdjacentElement('afterend', line);
  return line;
}

function showStatus(line, text, kind) {
  if (!line) return;
  line.textContent = text;
  line.className = 'order-status ' + kind;
  line.hidden = false;

  // make sure she can see an error message
  if (kind === 'error') {
    line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// the Order Code note, above the order form
const codeNote = document.createElement('p');
codeNote.className = 'order-code-note';
codeNote.hidden = true;
const formWrapper = document.querySelector('.form-wrapper');
if (formWrapper) {
  formWrapper.insertAdjacentElement('beforebegin', codeNote);
}

function showOrderCode(code) {
  codeNote.textContent = 'Your order code: ';
  const strong = document.createElement('strong');
  strong.textContent = code;
  codeNote.appendChild(strong);
  codeNote.hidden = false;
}

// the pop-up that tells her to continue to the order form
const notice = document.createElement('dialog');
notice.className = 'notice-modal';
notice.innerHTML =
  '<div class="notice-icon">&#10003;</div>' +
  '<h3>Your design is saved!</h3>' +
  '<p class="notice-label">Your order code</p>' +
  '<p class="notice-code"></p>' +
  '<p class="notice-text">One last step: fill in your contact details below so we can start on your outfit.</p>' +
  '<button type="button" class="btn-next notice-continue">Continue to order</button>' +
  '<button type="button" class="btn-ghost notice-close">Not yet</button>';
document.body.appendChild(notice);

function openNotice(code) {
  notice.querySelector('.notice-code').textContent = code;
  notice.showModal();
}

notice.querySelector('.notice-continue').addEventListener('click', function () {
  notice.close();
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
});

notice.querySelector('.notice-close').addEventListener('click', function () {
  notice.close();
});

// clicking the dark area outside the pop-up closes it too
notice.addEventListener('click', function (event) {
  if (event.target === notice) {
    notice.close();
  }
});

// =====================================================
// PART 6: Saving an order (sending it to your backend)
// =====================================================

// shrinks one picture (big phone photos become small, fast files)
function shrinkImage(file) {
  return new Promise(function (resolve, reject) {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = function () {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';                       // white behind see-through PNGs
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // save as JPEG; if it is still big, lower the quality a little
      let quality = 0.75;
      let data = canvas.toDataURL('image/jpeg', quality);
      while (data.length > MAX_PICTURE_CHARS && quality > 0.4) {
        quality -= 0.1;
        data = canvas.toDataURL('image/jpeg', quality);
      }

      resolve({ type: 'image/jpeg', data: data.split(',')[1] });
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };

    img.src = url;
  });
}

// The shared saving job. "kind" is 'wizard' or 'own'.
// ui = { status: the message line, setBusy: function(true/false), done: function(code) }
async function saveOrder(kind, order, files, ui) {
  const orderKey = JSON.stringify([order, files.map(function (item) {
    return [item.label, item.file.name, item.file.size, item.file.lastModified];
  })]);

  // too many pictures
  if (files.length > MAX_PICTURES) {
    showStatus(ui.status, 'You can add up to ' + MAX_PICTURES + ' pictures. Please remove a few.', 'error');
    return;
  }

  // already saved exactly this design? just show the pop-up again
  const previous = lastSent[kind];
  if (previous && previous.key === orderKey) {
    showOrderCode(previous.code);
    openNotice(previous.code);
    return;
  }

  // the backend link has not been pasted in yet
  if (ORDER_ENDPOINT.indexOf('PASTE') !== -1) {
    showStatus(ui.status, 'The order link is not set up yet.', 'error');
    return;
  }

  ui.setBusy(true);

  try {
    // 1. shrink the pictures, one at a time
    if (files.length > 0) {
      showStatus(ui.status, 'Preparing your pictures...', 'info');
      for (const item of files) {
        const small = await shrinkImage(item.file);
        order.images.push({ label: item.label, type: small.type, data: small.data });
      }
    }

    const body = JSON.stringify(order);
    if (body.length > MAX_TOTAL_CHARS) {
      throw new Error('too-big');
    }

    // 2. send everything to the backend
    showStatus(ui.status, 'Saving your design...', 'info');

    // no Content-Type header on purpose: it keeps the request simple for Google
    const response = await fetch(ORDER_ENDPOINT, { method: 'POST', body: body });
    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Could not save');
    }

    lastSent[kind] = { key: orderKey, code: result.orderCode };

    showStatus(ui.status, 'Your design is saved!', 'ok');
    showOrderCode(result.orderCode);
    ui.done(result.orderCode);
    openNotice(result.orderCode);       // tell her to continue to the order form

  } catch (error) {
    console.error(error);
    if (error.message === 'unreadable') {
      showStatus(ui.status, 'One of your pictures could not be read. Please use JPG or PNG pictures.', 'error');
    } else if (error.message === 'too-big') {
      showStatus(ui.status, 'Your pictures are too big all together. Please remove a few and try again.', 'error');
    } else {
      showStatus(ui.status, 'Sorry, we could not save your design. Please try again.', 'error');
    }
  } finally {
    ui.setBusy(false);
  }
}

// ---------- Saving from the Customize steps ----------
const wizardStatus = makeStatusLine(nextBtn.closest('.wizard-buttons'));

const wizardUi = {
  status: wizardStatus,
  setBusy: function (isBusy) {
    nextBtn.disabled = isBusy;
    if (isBusy) {
      nextBtn.textContent = 'Saving...';
    } else {
      showStep(currentStep);          // puts "Next" or "Finish" back correctly
    }
  },
  done: function (code) {
    showContinueLink(wizardContinue, code);
  }
};

// collects what the customer picked (the pictures are added later)
function buildOrder() {
  const choices = {};

  groups.forEach(function (group) {
    const title = group.querySelector('h3').textContent.trim();
    const selected = group.querySelector('.pill.selected');
    if (selected) {
      choices[title] = selected.textContent.trim();
    }
  });

  return {
    product: chosenProduct || 'Personalised Outfit',
    orderType: (!chosenProduct || chosenProduct === PERSONALISED_PRODUCT)
      ? 'Personalised outfit'
      : 'From collection',
    choices: choices,
    images: []
  };
}

// every picture chosen in the "Other" boxes, labelled with where it belongs
function collectFiles() {
  const list = [];

  groups.forEach(function (group) {
    const input = group.querySelector('.ref-input');
    if (!input) return;
    const label = group.querySelector('h3').textContent.trim();   // e.g. "Length"

    Array.from(input.files).forEach(function (file) {
      list.push({ label: label, file: file });
    });
  });

  return list;
}

function submitWizard() {
  const order = buildOrder();
  const files = collectFiles();

  // nothing picked at all
  if (!chosenProduct && Object.keys(order.choices).length === 0 && files.length === 0) {
    showStatus(wizardStatus, 'Please pick at least one option first.', 'error');
    return;
  }

  saveOrder('wizard', order, files, wizardUi);
}

// =====================================================
// PART 7: Personalised Outfits (her own pictures only)
// =====================================================
const ownInput = document.getElementById('own-images');
const ownPreview = document.getElementById('own-preview');
const ownSummaryText = document.getElementById('summary-text');
const ownBackBtn = document.getElementById('own-back-btn');
const ownNextBtn = document.getElementById('own-next-btn');

if (ownInput && ownNextBtn) {
  const ownContinue = makeContinueLink(ownSummaryText ? ownSummaryText.closest('.summary-box') : null);
  const ownStatus = makeStatusLine(ownNextBtn.closest('.wizard-buttons'));

  const updateOwnSummary = function () {
    const count = ownInput.files.length;
    if (ownSummaryText) {
      ownSummaryText.textContent = (count === 0)
        ? 'Nothing selected yet. Add your pictures above.'
        : 'Style: ' + PERSONALISED_PRODUCT + '  \u2022  Own design: ' + count + (count === 1 ? ' image' : ' images');
    }
    if (ownContinue) {
      ownContinue.hidden = true;
    }
  };

  ownInput.addEventListener('change', function () {
    showPreviews(ownInput, ownPreview);
    updateOwnSummary();
  });

  // Back: go up to the collections
  if (ownBackBtn) {
    ownBackBtn.addEventListener('click', function () {
      document.getElementById('categories').scrollIntoView({ behavior: 'smooth' });
    });
  }

  const ownUi = {
    status: ownStatus,
    setBusy: function (isBusy) {
      ownNextBtn.disabled = isBusy;
      ownNextBtn.textContent = isBusy ? 'Saving...' : 'Next';
    },
    done: function (code) {
      showContinueLink(ownContinue, code);
    }
  };

  // Next: save the pictures, then tell her to continue to order
  ownNextBtn.addEventListener('click', function () {
    const files = Array.from(ownInput.files).map(function (file) {
      return { label: 'Own design', file: file };
    });

    if (files.length === 0) {
      showStatus(ownStatus, 'Please add at least one picture first.', 'error');
      return;
    }

    const order = {
      product: PERSONALISED_PRODUCT,
      orderType: 'Personalised outfit',
      choices: {},
      images: []
    };

    saveOrder('own', order, files, ownUi);
  });
}

// =====================================================
// PART 8: Pop-out video viewer
// =====================================================
(function () {
  const dialog = document.createElement('dialog');
  dialog.className = 'video-modal';
  dialog.innerHTML =
    '<button type="button" class="modal-close" aria-label="Close video">&times;</button>' +
    '<video class="modal-video" controls playsinline loop></video>' +
    '<div class="modal-caption">' +
      '<p class="modal-title"></p>' +
      '<a href="#customize" class="btn btn-small modal-cta">How do you like your style?</a>' +
    '</div>';
  document.body.appendChild(dialog);

  const modalVideo = dialog.querySelector('.modal-video');
  const modalTitle = dialog.querySelector('.modal-title');
  const modalCta = dialog.querySelector('.modal-cta');
  let modalCard = null;

  function openModal(card) {
    const cardVideo = card.querySelector('video');
    const src = (cardVideo.getAttribute('src') || cardVideo.currentSrc).split('#')[0];

    modalCard = card;
    cardVideo.pause();
    modalVideo.src = src;
    modalVideo.muted = true;                // change to false if you want sound
    modalTitle.textContent = card.querySelector('h3').textContent.trim();

    dialog.showModal();
    modalVideo.play().catch(function () {});
  }

  dialog.addEventListener('close', function () {
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
  });

  dialog.querySelector('.modal-close').addEventListener('click', function () {
    dialog.close();
  });

  // the button in the pop-up also remembers the dress
  modalCta.addEventListener('click', function () {
    if (modalCard) {
      chosenProduct = modalCard.querySelector('h3').textContent.trim();
      updateSummary();
    }
    dialog.close();
  });

  // clicking the dark area outside the video closes it
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  // give every card that has a video its own arrow button
  document.querySelectorAll('.card').forEach(function (card) {
    if (!card.querySelector('video')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card-expand';
    button.setAttribute('aria-label', 'Watch bigger');
    button.innerHTML = '&#8599;';

    button.addEventListener('click', function () {
      openModal(card);
    });

    card.appendChild(button);
  });
})();

// =====================================================
// PART 9: Phones can't hover, so play a video while it is on screen
// =====================================================
(function () {
  if (!window.matchMedia('(hover: none)').matches) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.play().catch(function () {});
      } else {
        entry.target.pause();
      }
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.card video').forEach(function (video) {
    observer.observe(video);
  });
})();