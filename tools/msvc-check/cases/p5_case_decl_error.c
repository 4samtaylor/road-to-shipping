/* expect: an error (declaration straight after a case label) */
int main(void) {
    int k = 1;
    switch (k) {
    case 1:
        int x = 2;
        return x;
    }
    return 0;
}
