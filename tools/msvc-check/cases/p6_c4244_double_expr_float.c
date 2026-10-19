/* expect: C4244 */
int main(void) { float x = 2.0f; float h = x * 0.5; return (int)h; }
