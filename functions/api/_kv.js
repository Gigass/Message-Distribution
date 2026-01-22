export const getTokenKeys = (tokenId) => ({
  seatData: `seat_data:${tokenId}`,
  prizes: `prizes:${tokenId}`,
  winners: `winners:${tokenId}`,
  excludedIds: `excludedIds:${tokenId}`,
});
