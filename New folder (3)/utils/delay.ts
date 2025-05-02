async function delay (duration: number) {
  await new Promise((resolve) => setTimeout(resolve, duration));
}

export default delay;