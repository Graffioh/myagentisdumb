<script lang="ts">
  interface Props {
    show: boolean;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    show,
    message,
    confirmText = "confirm",
    cancelText = "cancel",
    onConfirm,
    onCancel,
  }: Props = $props();
</script>

{#if show}
  <div class="dialog-overlay">
    <div class="dialog" role="dialog" aria-modal="true">
      <span class="dialog-text">{message}</span>
      <div class="dialog-actions">
        <button class="dialog-button cancel" onclick={onCancel}>
          {cancelText}
        </button>
        <button class="dialog-button confirm" onclick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: #000000;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    animation: slideUp 0.2s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-text {
    color: #e6edf3;
    font-size: 14px;
    font-weight: 500;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
  }

  .dialog-button {
    padding: 4px 12px;
    border-radius: 8px;
    border: 1px solid transparent;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.25s;
    background-color: #1a1a1a;
    color: #c9d1d9;
    font-family: inherit;
  }

  .dialog-button:hover {
    border-color: #ffffff;
  }

  .dialog-button.confirm {
    border: 1px solid rgba(248, 81, 73, 0.3);
    color: #ff7b72;
  }

  .dialog-button.confirm:hover {
    border-color: #ff7b72;
  }
</style>
