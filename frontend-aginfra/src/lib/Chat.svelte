<script lang="ts">
    import TextInput from './TextInput.svelte'
    import TextArea from './TextArea.svelte'
</script>
  
<div id="chat">
    <TextArea />
    <TextInput />
</div>

<style>
    #chat {
        height: 100%;
        display: flex;
        flex-direction: column;
    }
</style>