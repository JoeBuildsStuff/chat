import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      getErrorRedirect(
        `${requestUrl.origin}/signin`,
        'No user',
        "Sorry, we weren't able to log you in. Please try again."
      )
    );
  }

  // Check if user is onboarded
  let { data: userprofiles, error } = await supabase
    .from('userprofiles')
    .select('bio')
    .eq('userid', user.id);

  if (error || !userprofiles || userprofiles.length === 0) {
    return NextResponse.redirect(
      getErrorRedirect(
        `${requestUrl.origin}/signin`,
        'Profile Error',
        "Sorry, we weren't able to retrieve your profile. Please try again."
      )
    );
  }

  const userProfile = userprofiles[0];

  if (userProfile.bio) {
    return NextResponse.redirect(
      `${requestUrl.origin}/workspace/rate-jobs/all-jobs`
    );
  } else {
    return NextResponse.redirect(
      getStatusRedirect(
        `${requestUrl.origin}/getting-started`,
        'Success!',
        'You are now signed in.'
      )
    );
  }
}
