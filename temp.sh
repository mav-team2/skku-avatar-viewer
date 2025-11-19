mkdir -p $LOG_DIR

echo "Starting participants..."

DIR=$(pwd)
PART="$DIR/participant"

echo "dir : $DIR"

$PART --id 1 --prog 0x20000651 > $LOG_DIR/participant1.log 2>&1 & P1=$!
ssh swui $PART --id 2 --prog 0x20000652 > $LOG_DIR/participant2.log 2>&1 & P2=$!
ssh swye $PART --id 3 --prog 0x20000653 > $LOG_DIR/participant3.log 2>&1 & P3=$!
