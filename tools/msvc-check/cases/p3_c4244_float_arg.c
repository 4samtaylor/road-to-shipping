/* expect: C4244 */
int half(int n) { return n / 2; }
int main(void) { return half(2.9f); }
