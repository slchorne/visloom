#!/usr/bin/env perl
#
# Perl common chunks
#
use strict ;
# use Data::Dumper;
# $Data::Dumper::Sortkeys = 1 ;

use feature qw(say state switch);

# SSL/LWP checks?
# $ENV{PERL_LWP_SSL_VERIFY_HOSTNAME}=0;

#### work out where i am
# these variables can then be used to find config files
# and keep the code portable

use FindBin qw($Bin $Script);
my ($BASE,$NAME)=($Bin,$Script) ;

use lib "lib" ;
use lib "$FindBin::Bin" ;
use lib "$FindBin::Bin/lib" ;

my $DEVCOUNT = 150 ;
my $SWITCHCOUNT = 20 ;
my $MAXLINK = 4 ;
my $FLOWCOUNT = $DEVCOUNT * 2 ;
my @TYPES = qw( http https voip dbs exchange lbs dns dhcp fw vpn );

# pre-generate the switch ID's
my @SIDS = map { sprintf( "s%03d" , $_ ) } ( 1 .. $SWITCHCOUNT );
# pre-generate the host ID's
my @HIDS = map { sprintf( "%04d" , $_ ) } ( 1 .. $DEVCOUNT );

# create the hosts
my @hlines ;
foreach my $hid ( @HIDS ) {
    my $type = $TYPES[ rand @TYPES ];
    my $sid = $SIDS[ rand @SIDS ];
    my $hname = "$type-$hid";

    my $hline = '        { "id": "'.$hid.'", '
        . '"name": "'.$hname.'", '
        . '"type": "'.$type.'", '
        . '"ovs": "'.$sid.'"}'
    ;

    push @hlines , $hline ;

}

say '{
    "hosts": [' ;
say join ( ",\n" , @hlines );
say '    ],' ;

# switches
my @slines ;
foreach my $sid ( @SIDS ) {
    my $sline = '        { "id": "'.$sid.'", '
        . '"name": "switch_'.$sid.'", '
        . '"type": "ovs"}'
    ;
    push @slines , $sline ;
}

say '    "switches": [' ;
say join ( ",\n" , @slines );
say '    ],' ;

# random generate flows form the hosts
my @flines ;
foreach my $fid ( 1 .. $FLOWCOUNT ) {
    my $src = $HIDS[ rand @HIDS ];
    my $dst = $HIDS[ rand @HIDS ];
    next if $src == $dst ;

    my $fl = '        { "src": "'.$src.'", "dst": "'.$dst.'" }';
    push @flines , $fl ;

}

say '    "flows": [' ;
say join ( ",\n" , @flines );
say '    ],' ;

# lastly we need to create uplinks, but keep it linear, we can't loop
# so we keep plucking off lists until we get concensus

say '    "uplinks": [' ;

# we have unattached switches in @SIDS
# we have linked edge switches in @linked, which can still take conections
# we have $MAXLINK uplinks per switch

# seed the first device, pull it off the list
my $fs = splice ( @SIDS , rand @SIDS , 1 ) ;

my @uplinks ;
my @edges ;

# now eat through the list of switches, kinda recursing
while ( @SIDS ) {
    linkEdges();
}

say join ( ",\n" , @uplinks );

say '    ]' ;
say '}' ;

exit ;


sub linkEdges {
    return unless @SIDS ;

    # get some random endpoints
    my @nextBatch = getEdges();    

    # link from here to these endpoints
    foreach my $ds ( @nextBatch ) {
        my $ul = '        { "src": "'.$fs.'", "dst": "'.$ds.'" }';
        push @uplinks , $ul ;
#         say "$ul";
    }
#     say "$fs , @edges , @nextBatch";

    # add these new edges to the list
    push @edges , @nextBatch ;

    # pop to the new edge
    $fs = pop @edges ;

    # repeat
    linkEdges();

}

sub getEdges {
    my @edges ;
    foreach my $lc ( 1 .. 2 + rand $MAXLINK ) {
        push @edges , splice ( @SIDS , rand @SIDS , 1 ) ;
    }
    return @edges ;
}



