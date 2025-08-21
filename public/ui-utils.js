export function createStarRating(containerId, hiddenInputId) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!container || !hiddenInput) return;

    const form = container.closest('form');

    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.classList.add('star', 'text-3xl', 'cursor-pointer', 'text-gray-300');
        star.dataset.value = i;
        star.innerHTML = '&#9733;';
        container.appendChild(star);
    }
    const stars = container.querySelectorAll('.star');
    const setRating = (value) => {
        hiddenInput.value = value;
        stars.forEach(star => {
            star.classList.toggle('text-yellow-400', star.dataset.value <= value);
            star.classList.toggle('text-gray-300', star.dataset.value > value);
        });
        if (form) {
            form.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };
    container.addEventListener('click', e => {
        if (e.target.classList.contains('star')) {
            const value = e.target.dataset.value;
            if (hiddenInput.value === value) {
                setRating(0);
            } else {
                setRating(value);
            }
        }
    });
    container.setRating = setRating;
}

export function createTagSelector(containerId, hiddenInputId, tagsFunc) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!container || !hiddenInput) return;

    const form = container.closest('form');

    const populateTags = () => {
        container.innerHTML = '';
        const tags = tagsFunc();
        tags.forEach(tag => {
            const button = document.createElement('button');
            button.type = 'button';
            button.classList.add('tag-button');
            button.dataset.value = tag;
            button.textContent = tag;
            container.appendChild(button);
        });
        container.setSelectedTags(hiddenInput.value);
    };

    container.addEventListener('click', e => {
        if (e.target.classList.contains('tag-button')) {
            e.target.classList.toggle('selected');
            const selectedValues = Array.from(container.querySelectorAll('.tag-button.selected'))
                .map(btn => btn.dataset.value);
            hiddenInput.value = selectedValues.join(',');
            if (form) {
                form.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });

    container.setSelectedTags = (tagString) => {
        const selected = tagString ? tagString.split(',') : [];
        hiddenInput.value = tagString || '';
        container.querySelectorAll('.tag-button').forEach(button => {
            button.classList.toggle('selected', selected.includes(button.dataset.value));
        });
    };

    container.populate = populateTags;
    populateTags();
}
