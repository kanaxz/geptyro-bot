
const deleteReply = (interaction) => {
  setTimeout(async () => {
    try {
      // Delete the reply
      await interaction.deleteReply();
    } catch (error) {
      console.error('Error deleting interaction reply:', error);
    }
  }, 5000); // 5000 milliseconds = 5 seconds
}


export default {
  deleteReply,
}