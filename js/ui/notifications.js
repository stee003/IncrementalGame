/**
 * Astral Foundry - Notification Toast System
 * Displays non-intrusive, atmospheric toasts for milestones,
 * research breakthroughs, and system events.
 */

export class NotificationManager {
    constructor(containerElement) {
        this.container = containerElement;
    }

    /**
     * Show a notification
     * @param {Object} options { title, desc, icon, type, duration }
     */
    show({ title, desc, icon = '✦', type = 'info', duration = 4000 }) {
        if (!this.container) return;

        const toast = document.createElement('div');
        toast.className = `foundry-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Close notification">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        const dismiss = () => {
            toast.classList.add('dismissing');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', dismiss);
        }

        this.container.appendChild(toast);

        // Auto dismiss
        setTimeout(dismiss, duration);
    }

    notifyMilestone(milestone) {
        this.show({
            title: `Milestone Achieved: ${milestone.name}`,
            desc: milestone.rewardText,
            icon: '🏆',
            type: 'milestone',
            duration: 5500
        });
    }

    notifyResearch(node) {
        this.show({
            title: `Research Completed: ${node.name}`,
            desc: node.desc,
            icon: '📜',
            type: 'research',
            duration: 4500
        });
    }

    notifySave() {
        this.show({
            title: 'Foundry Coordinates Recorded',
            desc: 'Progress saved successfully.',
            icon: '💾',
            type: 'save',
            duration: 2500
        });
    }

    notifySurge(name, mult) {
        this.show({
            title: `Astral Event: ${name}!`,
            desc: `Production surged by ${mult}x!`,
            icon: '⚡',
            type: 'surge',
            duration: 4000
        });
    }
}
