import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_ROUTES } from "@/routes/common/routePath";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRegisterMutation, useGoogleLoginMutation } from "@/features/auth/authAPI";
import { GoogleLogin } from "@react-oauth/google";
import { useAppDispatch } from "@/app/hook";
import { setCredentials } from "@/features/auth/authSlice";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;
const SignUpForm = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    register(values)
      .unwrap()
      .then(() => {
        form.reset();
        toast.success("Sign up successful");
        navigate(AUTH_ROUTES.SIGN_IN);
      })
      .catch((error) => {
        console.log(error);
        toast.error(error.data?.message || "Failed to sign up");
      });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-light tracking-tight">Join ObsidianFinance</h1>
          <p className="text-balance text-sm text-muted-foreground font-light">
            Create your secure profile below
          </p>
        </div>
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min. 6 characters" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-3">
            <Button disabled={isLoading || isGoogleLoading} type="submit" className="w-full">
              {isLoading && <Loader className="h-4 w-4 animate-spin" />}
              Sign up
            </Button>

            <div className="relative border-b border-white/10 my-1">
              <span className="absolute bg-[#0a0a0a] px-2 text-xs text-muted-foreground top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                OR
              </span>
            </div>

            <div className="flex justify-center mt-1">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  googleLogin({ token: credentialResponse.credential })
                    .unwrap()
                    .then((data) => {
                      dispatch(setCredentials(data));
                      toast.success("Account created via Google successfully");
                      setTimeout(() => navigate(PROTECTED_ROUTES.OVERVIEW), 1000);
                    })
                    .catch((error) => {
                      toast.error(error.data?.message || "Google Signup processing failed");
                    });
                }}
                onError={() => {
                  toast.error("Google authentication failed");
                }}
                theme="filled_black"
                shape="rectangular"
                width="100%"
                text="signup_with"
              />
            </div>
          </div>
        </div>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link
            to={AUTH_ROUTES.SIGN_IN}
            className="underline underline-offset-4"
          >
            Sign in
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default SignUpForm;
